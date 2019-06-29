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

router.get('/', async function (req, res) {
    try {
        const image_string = loadImageToBase64('./muell.jpg');
        console.log(image_string);

        res.status(200).send({success: true});
    } catch (error) {
        console.error(error);
        return res.status(500).send({result: {message: "There was an error importing the data!"}});
    }
});

function loadImageToBase64(filename) {
    const bmp = fs.readFileSync(filename);
    return new Buffer(bmp).toString('base64');

}

function image2Base64() {
    const file = new FileReader();
}


module.exports = router;
