const mongoose = require( 'mongoose' );
const config = require( 'config' );
mongoose.connect( 'mongodb://localhost/' + config.get( 'database.name' ) );