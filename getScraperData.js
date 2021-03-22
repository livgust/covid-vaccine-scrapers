const AWS = require("aws-sdk");

const s3 = new AWS.S3();

exports.handler = async () => {
    const data = await s3
        .getObject({
            Bucket: "ma-covid-vaccine",
            Key: "data.json",
        })
        .promise();

    const response = {
        statusCode: 200,
        body: data.Body.toString(),
    };
    return response;
};
