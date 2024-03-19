import { FeedType } from "./type/feed";
import { FeedUserType, UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const feedHandler = async (event) => {

    if(event.path === '/feeds')
      return await getRecommendedFeeds(event);

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
            body: 'invalid request method' };
    }
};

const warnFeed = async(event) => {
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

        if(alreadyWarn) return { statusCode: 200, body: JSON.stringify({success: false}) }
        
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
          body: JSON.stringify({success: true}) };

    } catch (error) {
        return { 
          statusCode: 500, 
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
          },
          body: error.message };
    }
}

const getRecommendedFeeds = async(event) => {

    const body: {
      friendOfFriendIds: number[];
      friendIds: number[];
      warnUserIds: number[];
    } = JSON.parse(event.body);

    const { friendOfFriendIds, friendIds, warnUserIds } = body;

    console.log("body", friendOfFriendIds, friendIds, warnUserIds)


    const expressionAttributeValues = {};
    const idListPlaceholders = 
      [...friendOfFriendIds, ...friendIds]
      .filter((id)=>!warnUserIds.includes(id))
      .map((id, index) => {

        const placeholder = `:id${index}`;
        expressionAttributeValues[placeholder] = id;
        return placeholder;
    });

    const scanParams = {
      TableName: 'feeds-table',
      FilterExpression: `writer.id IN (${idListPlaceholders.join(', ')})`,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: 40
    }

    try {
      const scanResult = await dynamoDB.scan(scanParams).promise();
      let recommendedFriends = scanResult.Items || [];

      const data: FeedType[] = recommendedFriends.map((feed:FeedType) => ({
        id: feed.id,
        question: feed.question,
        imgUrl: feed.imgUrl,
        warnUserIds: feed.warnUserIds,
        writer: feed.writer,
        asker: feed.asker,
        time: feed.time,
      }))

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error("Error fetching recommended feeds:", error);
      throw error; // 오류를 호출자에게 전파
    }
  }
  

const postFeed = async (event) => {

    const body = JSON.parse(event.body);
  
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

      const feedData = {
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
        

        // 아래 userUpdateParams를 수정해서 작성자의 feedIds에 feedId를 추가해야 함

        const userUpdateParams = {
          TableName: 'users-table',
          Key: { id: body.writer.id},
          UpdateExpression: "SET feedIds = list_append(feedIds, :feedId)",
          ExpressionAttributeValues: {
            ":feedId": [feedId],
          }
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
            })};
      } catch (error) {
          return { statusCode: 500, body: error.message };
      }
}