
## TYPE

**user**

```ts
interface UserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[];
    school?: string;
    schoolLocation?: string;
    friends: SimpleUserType[];

    requestFriends: SimpleUserType[]; //local only
    receivedFriends: SimpleUserType[]; //local only
    alarms: AlarmType[] //local only
}

//다른 객체의 하위로 들어갈 때 사용
interface SimpleUserType {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[];
    school?: string;
    schoolLocation?: string;
}
```

**feed**

```ts
import { SimpleUserType } from "./user";

export interface FeedType {
    id: number;
    question: string;
    imgUrl: string;
    time: string;
    warnUserIds: number[];
    
    writer: SimpleUserType;
    asker: SimpleUserType;
}
```

**alarm**

```ts
import { SimpleUserType } from "./user";

export type AlarmType = {
    id: number;
    question: string;
    asker: SimpleUserType;
}
```

**poll**

```ts
export interface PollType {
    id: number;
    question: string;
    nextTime: string
}
```

  
## API 요약

**user**  
<details>
<summary>회원가입: <code>POST/user</code></summary>

```ts
req
//Omit<UserType, 'id'| 'feedIds'| 'friends'>

interface req {
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    school?: string;
    schoolLocation?: string;
}

res

interface res {
    id: number
}

```
</details>

<details>
<summary>프로필 조회: <code>GET/user/:id</code></summary>

```ts

res
//UserType
interface res {
    id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[];
    school?: string;
    schoolLocation?: string;
    friends: SimpleUserType[];
}
```
</details>
  
**feed**
<details>
<summary>피드 작성하기: <code>POST/feed</code></summary>

```ts

req
//Omit<FeedType, 'imgUrl' | 'id' | 'warnUserIds' | 'time'>

interface req {
    question: string;
    writer: SimpleUserType;
    asker: SimpleUserType;
}

res

interface res {
  id: number,
  imgUrl: string
}

```


</details>


<details>
<summary>추천 피드 가져오기: <code>POST/feed/recommend</code></summary>

```ts

req

interface req {
    school?: string;
    schoolLocation?: string;
    friends: SimpleUserType[];
}

res
// FeedType[] 
interface res {
    id: number;
    question: string;
    imgUrl: string;
    time: string;
    warnUserIds: number[];
    
    writer: SimpleUserType;
    asker: SimpleUserType;
}[]

```
</details>

<details>
<summary>feedIds에 해당하는 피드 가져오기: <code>GET/feed/:feedIds</code></summary>

```ts

res
// FeedType[]
interface res {
    id: number;
    question: string;
    imgUrl: string;
    time: string;
    warnUserIds: number[];
    
    writer: SimpleUserType;
    asker: SimpleUserType;
}[]

```
</details>

<details>
<summary>글 신고하기: <code>PUT/feed/warn</code></summary>

```ts

req

interface req {
    userId: number
    feedId: number
}


res

```
</details>
  
**friend**  

<details>
<summary>친구 수락: <code>POST/friend</code></summary>

```ts

req

interface req {
    userId: number
    feedId: number
}


res

```
</details>

<details>
<summary>추천 친구: <code>POST/friend/recommend</code></summary>

```ts

req

interface req {
    phoneList: string[];
    school?: string;
    schoolLocation?: string;
    friendIds?: number[];
}


res
//SimpleUserType[]

interface res {
     id: number;
    token: string;
    name: string;
    age: number;
    phone: string;
    gender: "남자" | "여자";
    feedIds: number[];
    school?: string;
    schoolLocation?: string;
}[]

```
</details>



