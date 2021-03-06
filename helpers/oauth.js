const googleAuth = require('google-auth-library');
const request = require('request');
const Promise = require('bluebird');
const userModel = require('../models/user').Model;

let resp;
let options;
let access_token;
let url = 'https://www.googleapis.com/oauth2/v2/tokeninfo';

exports.initGoogleAuth = (config) => {
    let credentials = config.get('web');
    let auth = new googleAuth();
    let googleOauth2Client = new auth.OAuth2(credentials.client_id, credentials.client_secret);

    return googleOauth2Client;
}

exports.authorizeClient = (oauth2Client) => {
    access_token = oauth2Client.credentials.access_token;
    options = {
        'url': url,
        'form': {
            'access_token': access_token || ''
        }
    };

    return new Promise((resolve, reject) => {
        request.post(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resp = JSON.parse(body);

                if (resp.audience === oauth2Client.clientId_) {
                    userModel.findUser(resp.email).then((user) => {
                        if (user && user.ac_token !== access_token) {
                            userModel.UpdateUser(resp.email, access_token);
                            resolve('validated');
                        }
                        else if (user && user.ac_token === access_token) {
                            resolve('validated');
                        }
                        else {
                            userModel.CreateUser(resp.email, access_token).then((val) => {
                                if (val !== 'Complete') {
                                    reject('error');
                                }

                                resolve('validated');
                            });
                        }
                    }).catch((e) => {
                        console.log(e);
                        reject('error');
                    });
                }
                else {
                    reject('error');
                }
            }
            else {
                reject('error');
            }
        });
    });
}

exports.checkAuthToken = (oauth2Client) => {
    access_token = oauth2Client.credentials.access_token;
    options = {
        'url': url,
        'form': {
            'access_token': access_token || ''
        }
    };

    return new Promise((resolve, reject) => {
        request.post(options, function (error, response, body) {
            let data = JSON.parse(body);
            if (!error && response.statusCode === 400 && data.error_description === 'Invalid Value') {
                resolve('Invalid Credentials');
                return;
            }
            else if (!error && response.statusCode === 200) {
                resolve('Valid User');
                return;
            }
            else {
                reject((JSON.parse(body)).error_description);
                return;
            }
        });
    });
}