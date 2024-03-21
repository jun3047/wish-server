import { SimpleUserType, UserType } from "./type/user";

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const friendHandler = async (event) => {
  
  if(event.path === '/friend/recommend')
      return await getRecommendedFriends(event);

  switch (event.httpMethod) {
        case 'POST':
          return await beFriend(event);
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

    const expressionAttributeValues = {};
    const phoneListPlaceholders = phoneList.map((phone, index) => {
      const placeholder = `:phone${index}`;
      expressionAttributeValues[placeholder] = phone;
      return placeholder;
    });
  
    let filterExpression = `phone IN (${phoneListPlaceholders.join(', ')})`;
  
    if (school !== undefined) {
      expressionAttributeValues[":school"] = school;
      expressionAttributeValues[":schoolLocation"] = schoolLocation;
      filterExpression += ` OR (school = :school AND schoolLocation = :schoolLocation)`;
    }
  
    const scanParams = {
      TableName: 'users-table',
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    // TODO: friendIds가 있을 경우 
    // 추후 친구의 친구까지 고려하여 추천하는 로직 추가

    try {
      
        const scanResult = await dynamoDB.scan(scanParams).promise();
        const recommendedFriends: SimpleUserType[] = scanResult.Items.map(({ friends, ...simpleUser }) => simpleUser);

      return { 
        statusCode: 200, 
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
        },
        body: JSON.stringify(recommendedFriends)
      };

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
      user,
      targetUser,
    }: {
      user: SimpleUserType;
      targetUser: SimpleUserType;
    } = JSON.parse(event.body);
      
    try {
  
      const updateParams = {
        TableName: 'users-table',
        Key: { id: user.id },
        UpdateExpression: "SET friends = list_append(friends, :newFriend)",
        ExpressionAttributeValues: {
          ":newFriend": [targetUser],
        },
      };

      const targetUpdateParams = {
        TableName: 'users-table',
        Key: { id: targetUser.id },
        UpdateExpression: "SET friends = list_append(friends, :newFriend)",
        ExpressionAttributeValues: {
          ":newFriend": [user],
        },
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
        body: `Error: ${error}`
      };
    }
}