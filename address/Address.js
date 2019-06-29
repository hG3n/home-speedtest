const mongoose = require( 'mongoose' );
const MongoPaging = require( 'mongo-cursor-pagination' );
MongoPaging.config.MAX_LIMIT = 100000;

const AddressSchema = new mongoose.Schema( {
    _id: String,
    nation: String,
    zip: Number,
    city: String,
    district: String,
    street_nr: String,
    latitude: String,
    longitude: String
} );

BenefitSchema.index( { zip: -1 } );
BenefitSchema.index( { street_nr: -1 } );
BenefitSchema.plugin( MongoPaging.mongoosePlugin );

mongoose.model( 'Address', AddressSchema );

module.exports = mongoose.model( 'Address' );
