import { UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const userHandler = async (event) => {

    switch (event.httpMethod) {
        case 'POST':
          return await register(event);
        case 'GET':
          return await userInfo(event);
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


const register = async(event) => {

    const body: {
        token: string;
        name: string;
        age: number;
        phone: string;
        gender: "boy" | "girl";
        school?: string;
        schoolLocation?: string;
        requestFriendIds?: number[];
    } = JSON.parse(event.body);

    try {
      
      const countsParams = {
        TableName: 'cnts-table',
        Key: { id: 0 }
      }
  
      const data = await dynamoDB.get(countsParams).promise();
      const userId = data.Item.userCnt + 1
  
      const updateParams = {
        TableName: 'cnts-table',
        Key: { id: 0 },
        UpdateExpression: "SET userCnt = :userCnt",
        ExpressionAttributeValues: {
          ":userCnt": userId
        }
      };

      const userData: UserType = {
          school: undefined,
          schoolLocation: undefined,
          requestFriendIds: [],
          ...body,
          id: userId,
          feedIds: [],
          friendIds: [],
      }
      
      
      const params = {
        TableName: 'users-table',
        Item: userData,
      }

      // 친구 요청하고 push 보내는 것까지 하기
    
      await dynamoDB.update(updateParams).promise();
      await dynamoDB.put(params).promise();
  
      return { 
        statusCode: 200, 
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: JSON.stringify({id: userId}) };
    } catch (error) {
      console.log("error:", error);
  
      return { 
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: 'Error: Could not register user' };
    }
}  

const userInfo = async (event) => {

    try {
        const {id} = event.pathParameters;
        const params = {
            TableName: 'users-table',
            Key: {
                id: parseInt(id)
            }
        };
        
        const user = await dynamoDB.get(params).promise();
        
        return { 
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
          },
          body: JSON.stringify(user.Item) };
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