var aws = require("aws-sdk");
const { profileEnd } = require("console");
var ses = new aws.SES({ region: "us-east-1" });
const dynamoDBTable = new aws.DynamoDB.DocumentClient({ region: "us-east-1" });
const crypto = require("crypto");

exports.SesSendEmail =  (event, context, callback) => {
    let message = event.Records[0].Sns.Message;
    let msgJSON = JSON.parse(message);
    var eParams = {
        Key: {
            'id': msgJSON.Email
        },
        TableName: 'myDynamoDBTable'
    };
    dynamoDBTable.get(eParams, function (error, code) {
        var codeJS = JSON.stringify(code);
        
        if (error) {
            console.log("Error",error);
        }
        else {
            if (Object.keys(code).length >= 0) {
                var flag = false;
                if(code.Item == undefined){flag = true;}else
                    if(code.Item.TimeToExist < (new Date).getTime()){flag = true;}
                if(flag){
                    var expirationTime = (new Date).getTime() + (60*1000*5);
                    var params = {
                        Item: {
                            'id': msgJSON.Email,
                            'token': crypto.randomBytes(16).toString("hex"),
                            'TimeToExist': expirationTime
                        },
                        TableName: 'myDynamoDBTable'
                    };

                    dynamoDBTable.put(params, function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                            let token = params.Item.token;
                            let username = msgJSON.Email;
                            console.log('username', username);
                            console.log('token', token);
                            
                            var cParams = {
                                Destination: {
                                    ToAddresses: [username]
                                },
                                Message: {
                                    Body: {
                                        Html: {
                                            Charset: "UTF-8",
                                            Data: `<h3>Hi ${username}!</h3><br/>
                                            <p>Please click on this link to verify your email address and be able to access more services. <b>Remember the link is valid for only 5 minutes</b></p><br/>
                                            <a href=""http://prod.shreyaghate.me/v1/verifyUserEmail?email="${username}+"&token="${token}">"http://prod.shreyaghate.me/v1/verifyUserEmail?email="${username}+"&token="${token}</a></br>
                                            <link>"http://prod.shreyaghate.me/v1/verifyUserEmail?email="${username}+"&token="${token}</link>
                                            <p>Best,<br/>
                                            Team CSYE-6225 Prod, Shreya Ghate</p>`
                                        },
                                        // Text: {
                                        //     Data: "http://prod.shreyaghate.me/v1/verifyUserEmail?email="+username+"&token="+token
                                        // },
                                        // Html: {
                                        //     Charset: "UTF-8",
                                        //     Data: `
                                        //     <p>Best,<br/>
                                        //     Team CSYE-6225 Prod, Shreya Ghate</p>`
                                        // },
                                    },
                                    Subject: {
                                        Data: "You are one step closer to access your favourite APIs!"
                                    }
                                },
                                Source: "csye6225-spring22@prod.shreyaghate.me"
                            };
                            ses.sendEmail(cParams, function (err, data) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    console.log("Email has been sent!");
                                    
                                }
                            });
                        }
                    });
                }else
                console.log( code , "User exists");
            }
        }
    });
};
