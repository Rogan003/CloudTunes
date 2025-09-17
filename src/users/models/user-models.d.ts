export interface User {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    username: string;
    email: string;
    password: string;
}
export interface Subscription {
    userId: string;
    type: string;
    targetId: string;
    timestamp: string;
}
