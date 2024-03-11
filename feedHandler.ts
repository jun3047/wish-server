import { FeedType } from "./type/feed";
import env from './env.json';

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const feedHandler = async (event) => {

    switch (event.httpMethod) {
        case 'GET':
          return await getRecommendedFeeds(event);
        case 'POST':
          return await postFeed(event);
        case 'PUT':
          return await warnFeed(event);
        default:
          return { statusCode: 400, body: 'invalid request method' };
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
    
        return { statusCode: 200, body: JSON.stringify({success: true}) };

    } catch (error) {
        return { statusCode: 500, body: error.message };
    }
}

const getRecommendedFeeds = async(event) => {

    const body: {
      phone: string;
      school?: string;
      schoolLocation?: string;
      friendIds: number[];  
    } = JSON.parse(event.body);
      
    try {
  

      // body = phone school friednIds 고려해서 추천 피드 보내주기

      const params = {
        TableName: 'feeds-table',
        Key: { id: 1 }
      }
  
      const data = await dynamoDB.get(params).promise();

      const feeds = {
        ...data.Item
      }

      return { 
        statusCode: 200, 
        body: JSON.stringify({feeds: feeds}) };
    } catch (error) {
      console.log("error:", error);
  
      return { statusCode: 500, body: 'Error: Could not register user' };
    }
}

const postFeed = async (event) => {

    const body : {
      token: string;
      question: string;
      writerId: number;
      writerName: string;
      askerId: number;
      askerName: string;
    } = JSON.parse(event.body);
  
    try {

      const countsParams = {
        TableName: 'cnts-table',
        Key: { id: 0 }
      }
      const data = await dynamoDB.get(countsParams).promise();

      const feedId = data.Item.feedCnt + 1

      const awsConfig = {
        accessKeyId: env['ACCESS_KEY_ID'],
        secretAccessKey: env['SECRET_ACCESS_KEY'],
        region: 'ap-northeast-2'
      };
      
      const s3 = new AWS.S3(awsConfig);

      const fileName = feedId + '.jpg';

      const s3Params = {
        Bucket: env['BUCKET_NAME'],
        Key: fileName,
        Expires: 60,
        ContentType: 'image/jpeg',  
        ACL: 'public-read'
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
          imgUrl: preSignedURL,
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
            
        return { statusCode: 200, body: JSON.stringify(
          {
            id: feedId,
            imgUrl: preSignedURL
          }
        ) };
      } catch (error) {
          return { statusCode: 500, body: error.message };
      }
}