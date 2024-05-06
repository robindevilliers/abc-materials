export declare const TokenType: {
    EQUAL: string;
    NOT_EQUAL: string;
    LESS_THAN: string;
    LESS_THAN_OR_EQUAL: string;
    GREATER_THAN: string;
    GREATER_THAN_OR_EQUAL: string;
    OR: string;
    AND: string;
    BANG: string;
    REFERENCE: string;
    BUILTIN: string;
    GLOBAL_VARIABLE: string;
    TRUE: string;
    FALSE: string;
    STRING: string;
    NUMBER: string;
    OPEN_PARENTHESIS: string;
    CLOSE_PARENTHESIS: string;
    OPEN_SEQUENCE: string;
    CLOSE_SEQUENCE: string;
    OPEN_SLICE: string;
    OPEN_HASH: string;
    CLOSE_HASH: string;
    COMMA: string;
    COLON: string;
    ASSIGN: string;
    ADD_AND_ASSIGN: string;
    SUBTRACT_AND_ASSIGN: string;
    MULTIPLY_AND_ASSIGN: string;
    DIVIDE_AND_ASSIGN: string;
    MODULUS_AND_ASSIGN: string;
    PLUS: string;
    MINUS: string;
    MULTIPLY: string;
    DIVIDE: string;
    MODULUS: string;
    RANGE_INCLUSIVE: string;
    RANGE_EXCLUSIVE: string;
    RANGE_LENGTH_INC: string;
    RANGE_LENGTH_DEC: string;
    DEREFERENCE: string;
    CALL_BUILTIN: string;
    CALL_METHOD: string;
    IS_DEFINED: string;
    LAMBDA: string;
    PLUS_PLUS: string;
    MINUS_MINUS: string;
};
export declare class Token {
    private type;
    private token;
    private row;
    private column;
    constructor(type: string, token: string, row: number, column: number);
    getType(): string;
    getToken(): string;
    getRow(): number;
    getColumn(): number;
}
export declare function tokenize(expression: string, row?: number, column?: number): Token[];