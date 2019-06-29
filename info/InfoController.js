const express = require( 'express' );
const router = express.Router();
const bodyParser = require( 'body-parser' );
router.use( bodyParser.urlencoded( { extended: false } ) );
router.use( bodyParser.json() );

router.get( '/', function ( req, res, next ) {
    let revision = require( 'child_process' )
        .execSync( 'git rev-parse --short HEAD' )
        .toString().trim();
    res.status( 200 ).send( { result: { version: revision } } );
} );

module.exports = router;