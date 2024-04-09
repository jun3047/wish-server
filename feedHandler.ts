import { FeedType } from "./type/feed";
import { SimpleUserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const feedHandler = async (event) => {

  if (event.path === '/feed/recommend')
    return await getRecommendedFeeds(event);
  
  if (event.path === '/feeds')
    return await getFeeds(event);

  switch (event.httpMethod) {
    case 'POST':
      return await postFeed(event);
    case 'PUT':
      return await warnFeed(event);
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

  // TODO: 친구가 아니더라도 학교가 같은 사람들의 피드도 추천해줘야 함
  // NOW: 현재는 친구들의 피드만 추천해주고 있음

  const friendIds: number[] = friends.flatMap(friend => friend.id);

  console.log("friendIds:", friendIds)

  try{

    const uniqueFriendIds = Array.from(new Set(friendIds));
    const friendFeedIds = await getFriendFeedIds(uniqueFriendIds)

    console.log("friendFeedIds:", friendFeedIds)
    if(friendFeedIds.length === 0) return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: JSON.stringify([])
    };
  
    const recommendedFeeds = await getFeedsByIds(friendFeedIds)
    console.log("recommendedFeeds:", recommendedFeeds)

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
      },
      body: JSON.stringify(recommendedFeeds)
    };
    
  } catch (error) {
    console.error('Error fetching friends by friendIds:', error);
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

const getFriendFeedIds = async (friendIds: number[]) => {
  const batchGetParams = {
    RequestItems: {
      'users-table': {
        Keys: friendIds.map(id => ({ id }))
      }
    }
  };

  const batchGetResult = await dynamoDB.batchGet(batchGetParams).promise();
  const friendsData = batchGetResult.Responses['users-table'];

  const friendFeedIds = friendsData.flatMap(friend => friend.feedIds);

  return friendFeedIds;
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

const getFeedsByIds = async (feedIds: number[]) => {

  const params = {
    RequestItems: {
      'feeds-table': {
        Keys: feedIds.map(id => ({ id }))
      }
    }
  };

  const res = await dynamoDB.batchGet(params).promise();

  const feeds: FeedType[] = res.Responses['feeds-table'];

  return feeds;
}

const getFeeds = async (event) => {

  try {
    const feedIds: string[] = JSON.parse(event.body);
    if(feedIds.length === 0) return []
    
    const feedIds_num = feedIds.map((id: string) => parseInt(id));

    const feeds = await getFeedsByIds(feedIds_num);

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