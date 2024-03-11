export interface FeedType {
    id: number;
    token: string;
    question: string;
    imgUrl: string;
    warnUserIds: number[];
    writerId: number;
    writerName: string;
    askerId: number;
    askerName: string;
    time: string;
}