
/**
 * Application wide supported status codes with descriptive names.
 */
export enum Status {
    // Success codes
    SUCCESS = 200,
    PARTIAL_INFORMATION = 203,

    // Redirection codes
    REDIRECT = 301,
    USE_CACHE = 304,

    // Client error codes
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNSUPPORTED_METHOD = 405,
    NOT_ACCEPTABLE  = 406,
    TIMEOUT = 408,
    PRECONDITION_FAILED = 412,
    URL_EXCEEDED = 414,
    RATE_EXCEEDED = 429,

    // Server error codes
    INTERNAL_ERROR = 500
}