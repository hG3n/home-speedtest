const express = require('express');
const app = express();
// const bearerToken = require( 'express-bearer-token' );
// const morgan = require( 'morgan' );
// const handlebars = require( 'express-handlebars' );
// let hbs = handlebars.create( { /* config */ } );

// app.use( bearerToken( { reqKey: 'access_token' } ) );
// app.use( morgan( 'dev' ) );

// app.engine( 'handlebars', hbs.engine );
// app.set( 'view engine', 'handlebars' );

// let AuthController = require( './auth/AuthController' );
// app.use( '/auth', AuthController );

let SpeedtestController = require('./speedtest/SpeedtestController');
app.use('/speed', SpeedtestController);

let InfoController = require('./info/InfoController');
app.use('/info', InfoController);

// const swaggerUi = require( 'swagger-ui-express' );
// const swaggerDocument = require( './doc/weloveapps_wert-swagger.json' );
// app.use( '/api-docs', swaggerUi.serve, swaggerUi.setup( swaggerDocument ) );

// app.use( '/.well-known', express.static( 'well-known', {
//         setHeaders: function ( res, path ) {
//             res.type( "application/json" );
//         }
//     } )
// );

// app.use( '/auth/assets', express.static( 'templates/assets' ) );

module.exports = app;
