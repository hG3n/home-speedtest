const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const moment = require('moment');
const {check, validationResult} = require('express-validator/check');
const _ = require('underscore');
const url = require('url');

router.use(bodyParser.urlencoded({extended: false}));
router.use(bodyParser.json());

const fs = require('fs');
const util = require('util');

router.post('/', async function (req, res) {
    try {
        const timestamp = new Date();

        const file_name = `dump-${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDay()}.json`;
        fs.writeFile(file_name, JSON.stringify(req.body), (err) => {
            console.log(err);
        });

        res.status(200).send({success: true});
    } catch (error) {
        console.error(error);
        return res.status(500).send({result: {message: "There was an error importing the data!"}});
    }
});

module.exports = router;
