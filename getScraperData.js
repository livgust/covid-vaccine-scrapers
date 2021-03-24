const AWS = require("aws-sdk");

const s3 = new AWS.S3();

exports.handler = async () => {
    const data = await s3
        .getObject({
            Bucket: "ma-covid-vaccine",
            Key: "data.json",
        })
        .promise();
    const bodyData = JSON.parse(data.Body.toString());
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData)
    };
    return response;
};
