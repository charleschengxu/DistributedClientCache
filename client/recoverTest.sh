#!/bin/bash

node populateKV.js
node recoveryTest.js 123 &
sleep 10
echo $!
node mute.js 123
node populateKV.js
node unmute.js 123
sleep 20
echo $!
kill $!