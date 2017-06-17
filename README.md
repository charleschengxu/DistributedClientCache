## Scalable and Consitent Client Caching for Distributed Key-value Store

### Prereq
* Node.js 6.9.4+

### To Start
* run `$ npm install` to install all dependencies. 
* run `bin/www` to start the server, which by default listens on port `3000`
* `client/client.js` is the client library through which the application interacts with the key-value store. See `client/stresstest.js` for example of its use.

### Server RESTful APIs
#### `GET /api/:key/:principalId`
Return the value corresponding to the key specified on path.
`:principalId` is used to identify a client for proper notifications upon subsequent updates on the key-value store. 
Response is the following:
```json
{
    "key": "bf8b4530d8d246dd74ac53a13471bba17941dff7",
    "value": {
        "value": "blob",
        "timeStamp": "2017-04-13T18:17:33.327Z"
    }
}
```

#### `PUT /api/:principalId`
Request body needs to be:
```json
{
    "key": "bf8b4530d8d246dd74ac53a13471bba17941dff7",
    "value": {
        "value": "blob",
        "timeStamp": "2017-04-13T18:17:33.327Z"
    }
}
```

#### `POST /api/lease`
Renew session lease. Implemented as open rpc
Request body needs to be:
```json
{
    "principalId": "123",
    "recoveryMode": true | false
}
```
Response is a collection of updates that are committed between now and the previous server response. 
```json
{
    "bf8b4530d8d246dd74ac53a13471bba17941dff7": {
        "value": "blob",
        "timeStamp": "2017-04-13T18:17:33.327Z"
    },
    "bf8b4530d8d24fdafdsafdsafdsafdsafds1dff7": {
        "value": "blob",
        "timeStamp": "2017-04-12T11:17:33.327Z"
    },
}
```

#### `POST /api/mute/:clientId`
Suspends responses to client identified with `:clientId`. Used to simulate network partitions.

#### `POST /api/unmute/:clientId`
Resume responses to client identified with `:clientId`. Used to simulate network partitions.

#### `GET /api/stat`
Poll the system statistics.
Response:
```json
{
	"subsptnNumEntries": 97497,
	"updateMsgCount": 132327,
}
```
