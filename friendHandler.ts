import { UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const friendHandler = async (event) => {
  
  if(event.path === '/friend/recommend')
      return await getRecommendedFriends(event);

  switch (event.httpMethod) {
        case 'POST':
          return await beFriend(event);
        case 'PUT':
          return await requestFriend(event);
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

const getRecommendedFriends = async(event) => {
    const {
      phoneList,
      school,
      schoolLocation,
      friendIds,
    }: {
      phoneList: string[];
      school?: string;
      schoolLocation?: string;
      friendIds?: number[];
    } = JSON.parse(event.body);

    try {

      // case 1 friendIds가 없으면, 같은 학교 및 같은 번호

      const expressionAttributeValues = {};
      const phoneListPlaceholders = phoneList.map((phone, index) => {
        const placeholder = `:phone${index}`;
        expressionAttributeValues[placeholder] = phone;
        return placeholder;
      });

      const scanParams = school === undefined ? {
          TableName: 'users-table',
          FilterExpression: `phone IN (${phoneListPlaceholders.join(', ')})`,
          ExpressionAttributeValues: expressionAttributeValues
          }: {
          TableName: 'users-table',
          FilterExpression: "school = :school AND schoolLocation = :schoolLocation",
          ExpressionAttributeValues: {
              ":school": school,
              ":schoolLocation": schoolLocation,
          }
      }
      
      const scanResult = await dynamoDB.scan(scanParams).promise();
      
      const recommendedFriends: UserType[] = scanResult.Items;

      return { 
        statusCode: 200, 
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: JSON.stringify(recommendedFriends) };

      // case 2 friendIds가 있으면, 유저의 친구 리스트를 가져오기
      // {
      //   id: number;
      //   name: string;
      //   age: number;
      //   gender: "boy" | "girl";
      //   school: string;
      //   friendIds?: string[];
      // }[]
      
      // await dynamoDB.update(updateParams).promise();

      // 친구면 제외하는 로직

    } catch (error) {
      console.log("error:", error.message);
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

const beFriend = async(event) => {

    const {
      id,
      targetId,
    }: {
      id: number;
      targetId: number;
    } = JSON.parse(event.body);
      
    try {
  
      const updateParams = {
        TableName: 'users-table',
        Key: { id: id },
        UpdateExpression: "SET friendIds = list_append(friendIds, :newFriend)",
        ExpressionAttributeValues: {
          ":newFriend": [targetId],
        },
        ReturnValues: "UPDATED_NEW"
      };

      const targetUpdateParams = {
        TableName: 'users-table',
        Key: { id: targetId },
        UpdateExpression: "SET friendIds = list_append(friendIds, :newFriend)",
        ExpressionAttributeValues: {
          ":newFriend": [id],
        },
        ReturnValues: "UPDATED_NEW"
      };
      
      await dynamoDB.update(updateParams).promise();
      await dynamoDB.update(targetUpdateParams).promise();

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: JSON.stringify({success: true})
      };
      
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

const requestFriend = async (event) => {

    const {
      id,
      name,
      age,
      school,
      schoolLocation,
      friendIds,
      targetId,
      targetToken,
    }: {
      id: number;
      name: string;
      age: number;
      school?: string;
      schoolLocation?: string;
      friendIds: number[];
      targetId: number;
      targetToken: string;
  } = JSON.parse(event.body);
  
    try {

        //  targetToken에 push 보내고
        const pushData = {
          id: id,
          name: name,
          age: age,
          school: school,
          schoolLocation: schoolLocation,
          friendIds: friendIds,
        }

        // targetId의 requestFriendIds에 추가
        const targetUpdateParams = {
          TableName: 'users-table',
          Key: { id: targetId },
          UpdateExpression: "SET requestFriendIds = list_append(requestFriendIds, :newFriend)",
          ExpressionAttributeValues: {
            ":newFriend": [id],
          },
          ReturnValues: "UPDATED_NEW"
        };
        
        await dynamoDB.update(targetUpdateParams).promise();  

        console.log("targetToken:", targetToken);
            
        return { 
          statusCode: 200, 
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
          },
          body: JSON.stringify({
            success: true
        }) };
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