const config = require( 'config' );

let app = require( './app' );
let port = process.env.PORT || config.get( 'server.port' );

let server = app.listen( port, function () {
    console.log( 'Express server listening on port ' + port );
} );