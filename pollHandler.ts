import { FeedType } from "./type/feed";
import { FeedUserType, UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const pollHandler = async (event) => {

    switch (event.httpMethod) {
        case 'PUT':
          return await poll(event);
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

const poll = async(event) => {
    const {
      question,
      asker,
      writer
    }: {
      question: string;
      asker: FeedUserType
      token: string;
      writer: FeedUserType;
    } = JSON.parse(event.body);

    try {
              
        // push 보내기 (targetToken)
        // question, id, token, targetId, targetToken

        console.log(
          "question:", question,
          "asker:", asker,
          "writer:", writer
        )
    
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