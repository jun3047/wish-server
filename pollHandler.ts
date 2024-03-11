import { FeedType } from "./type/feed";
import { UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const pollHandler = async (event) => {

    switch (event.httpMethod) {
        case 'PUT':
          return await poll(event);
        default:
          return { statusCode: 400, body: 'invalid request method' };
    }
};

const poll = async(event) => {
    const {
      question,
      id,
      token,
      targetId,
      targetToken,
    }: {
      question: string;
      id: number;
      token: string;
      targetId: number;
      targetToken: string;
    } = JSON.parse(event.body);

    try {
              
        // push 보내기 (targetToken)
        // question, id, token, targetId, targetToken
    
        return { statusCode: 200, body: JSON.stringify({success: true}) };

    } catch (error) {
        return { statusCode: 500, body: error.message };
    }
}