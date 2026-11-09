export function sendSuccess(
    res,
    message,
    data = null,
    statusCode = 200,
    meta,
) {
    const body = {
        success: true,
        message,
        data,
    };

    if (meta !== undefined) {
        body.meta = meta;
    }

    return res.status(statusCode).json(body);
}
