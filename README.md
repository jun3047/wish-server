
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

**alarm**

```ts
export interface AlarmType {
    id: number;
    question: string;
    asker: SimpleUserType;
}
```

  
## API 요약

**user**  
- 회원가입: ```POST/user```
- 프로필 조회: ```GET/user/:id```

**feed**  
- 피드 작성하기: ```POST/feed```  
- 추천 피드 가져오기: ```POST/feed/recommend```
- feedIds에 해당하는 피드 가져오기: ```GET/feed/:feedIds```  
- 글 신고하기: ```PUT/feed/warn```

**poll**  
- 투표하기: ```PUT/poll```  

**friend**  
- 친구 요청: ```PUT/friend/request```  
- 친구 수락: ```POST/friend```  
- 추천 친구: ```POST/friend/recommend```

