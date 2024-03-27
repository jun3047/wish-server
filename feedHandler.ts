import { FeedType } from "./type/feed";
import { SimpleUserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const feedHandler = async (event) => {

  if (event.path === '/feed/recommend')
    return await getRecommendedFeeds(event);

  switch (event.httpMethod) {
    case 'POST':
      return await postFeed(event);
    case 'PUT':
      return await warnFeed(event);
    case 'GET':
      return await getFeeds(event);
    default:
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: 'invalid request method'
      };
  }
};

const warnFeed = async (event) => {
  const {
    userId,
    feedId
  }: {
    userId: number;
    feedId: number;
  } = JSON.parse(event.body);

  try {

    const params = {
      TableName: 'feeds-table',
      Key: { id: feedId }
    }

    const data = await dynamoDB.get(params).promise();
    const feed = data.Item;

    const alreadyWarn = feed.warnUserIds.includes(userId);

    if (alreadyWarn) return { statusCode: 200, body: JSON.stringify({ success: false }) }

    feed.warnUserIds.push(userId);

    const updateParams = {
      TableName: 'feeds-table',
      Key: { id: feedId },
      UpdateExpression: "SET warnUserIds = :warnUserIds",
      ExpressionAttributeValues: {
        ":warnUserIds": feed.warnUserIds
      }
    };

    await dynamoDB.update(updateParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: error.message
    };
  }
}

const getRecommendedFeeds = async (event) => {
  const body: {
    school?: string;
    schoolLocation?: string;
    friends: SimpleUserType[];
  } = JSON.parse(event.body);

  const { school, schoolLocation, friends } = body;

  const friendFeedIds = friends.flatMap(friend => friend.feedIds);
  let recommendedFeeds: FeedType[] = [];

  if (friendFeedIds.length > 0) {
    const batchGetParams = {
      RequestItems: {
        'feeds-table': {
          Keys: friendFeedIds.map(id => ({ id }))
        }
      }
    };

    try {
      const batchGetResult = await dynamoDB.batchGet(batchGetParams).promise();
      recommendedFeeds = batchGetResult.Responses['feeds-table'];
    } catch (error) {
      console.error('Error fetching feeds by feedIds:', error);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: error.message
        };
      }
    }

  if (school) {
    const schoolSpecificFeeds = recommendedFeeds.filter(feed =>
      feed.writer.school === school && feed.writer.schoolLocation === schoolLocation
    );

    recommendedFeeds = [...schoolSpecificFeeds];
  }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: JSON.stringify(recommendedFeeds)
    };
}


const postFeed = async (event) => {

  type PostFeedBody = Omit<FeedType, 'imgUrl' | 'id' | 'warnUserIds' | 'time'>
  const body: PostFeedBody = JSON.parse(event.body);

  try {

    const countsParams = {
      TableName: 'cnts-table',
      Key: { id: 0 }
    }

    const data = await dynamoDB.get(countsParams).promise();

    const feedId = data.Item.feedCnt + 1

    const awsConfig = {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      region: 'ap-northeast-2'
    };

    const s3 = new AWS.S3(awsConfig);

    const fileName = feedId + '.jpg';

    console.log("process.env.BUCKET_NAME:", process.env.BUCKET_NAME)
    console.log("process.env.ACCESS_KEY_ID:", process.env.ACCESS_KEY_ID)

    const s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key: fileName,
      Expires: 60,
      ContentType: 'image/jpeg',
      // ACL: 'public-read'
    };

    const preSignedURL = s3.getSignedUrl('putObject', s3Params);

    const updateParams = {
      TableName: 'cnts-table',
      Key: { id: 0 },
      UpdateExpression: "SET feedCnt = :feedCnt",
      ExpressionAttributeValues: {
        ":feedCnt": feedId
      }
    };

    const feedData: FeedType = {
      ...body,
      imgUrl: preSignedURL.split('?')[0],
      id: feedId,
      warnUserIds: [],
      time: new Date().toISOString()
    }

    const params = {
      TableName: 'feeds-table',
      Item: feedData,
    }

    await dynamoDB.update(updateParams).promise();
    await dynamoDB.put(params).promise();

    const userUpdateParams = {
      TableName: 'users-table',
      Key: { id: body.writer.id },
      UpdateExpression: "SET feedIds = list_append(feedIds, :feedId)",
      ExpressionAttributeValues: {
        ":feedId": [feedId],
      },
    };

    await dynamoDB.update(userUpdateParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: JSON.stringify(
        {
          id: feedId,
          imgUrl: preSignedURL
        })
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
}


const getFeeds = async (event) => {

  try {
    const { feedIds } = event.pathParameters;

    const keys = feedIds.split(',').map((id: string) => ({ id: parseInt(id) }));

    const params = {
      RequestItems: {
        'feeds-table': {
          Keys: keys
        }
      }
    };

    const res = await dynamoDB.batchGet(params).promise();

    const feeds: FeedType[] = res.Responses['feeds-table'];


    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: JSON.stringify(feeds)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: error.message
    };
  }
}