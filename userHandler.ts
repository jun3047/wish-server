import { UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const userHandler = async (event) => {

    switch (event.httpMethod) {
        case 'POST':
          return await register(event);
        case 'GET':
          return await getUser(event);
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

    type RegisterBody = Omit<UserType, 'id'| 'feedIds'| 'friends'>
    const body: RegisterBody = JSON.parse(event.body);
  
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
          ...body,
          id: userId,
          feedIds: [],
          friends: [],
      }
      
      const params = {
        TableName: 'users-table',
        Item: userData,
      }

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

const getUser = async (event) => {

    try {
        const {id} = event.pathParameters;
        const params = {
            TableName: 'users-table',
            Key: {
                id: parseInt(id)
            }
        };
        
        const res = await dynamoDB.get(params).promise();
        const user: UserType = res.Item
        
        return { 
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
          },
          body: JSON.stringify(user)};
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