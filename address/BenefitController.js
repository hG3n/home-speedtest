const express = require( 'express' );
const router = express.Router();
const bodyParser = require( 'body-parser' );
const moment = require( 'moment' );
const { check, validationResult } = require( 'express-validator/check' );
const _ = require( 'underscore' );
const url = require( 'url' );

const VerifyAccessToken = require( '../auth/VerifyAccessToken' );
const User = require( '../user/User' );

const constants = require( '../constants' );

router.use( bodyParser.urlencoded( { extended: false } ) );
router.use( bodyParser.json() );

const query_max_limit = 5000;

const Address = require( './Address' );

const list_fields = {
    _id: 1,
    updated_at: 1,
    title: 1,
    subtitle: 1,
    description: 1,
    date_start: 1,
    date_end: 1,
    image: 1,
    source: 1,
    annotation_title: 1,
    event: 1
};

const MailComposer = require( 'nodemailer/lib/mail-composer' );
const fs = require( 'fs' );
const util = require( 'util' );
const exec = util.promisify( require( 'child_process' ).exec );

const nodemailer = require( 'nodemailer' );
const transporter = nodemailer.createTransport( {
    service: 'Gmail',
    auth: {
        user: 'wlatickets@gmail.com',
        pass: 'scum3]washed'
    }
} );

const check_limit_is_int = [ check( 'limit' ).isInt().optional() ];
const check_limit_is_int_source_is_string = [ check( 'limit' ).isInt().optional(), check( 'source' ).isString(), check( 'source' ).custom( ( value, { req } ) => _.contains( constants.sources, value ) ) ];
const check_limit_is_int_start_date_end_date = [ check( 'limit' ).isInt().optional(), check( 'start_date' ).isISO8601(), check( 'end_date' ).isISO8601() ];

router.get( '/', check_limit_is_int, async function ( req, res ) {
    try {
        let limit = req.query.limit;
        if ( !limit ) limit = 100;
        limit = parseInt( limit );
        if ( limit > query_max_limit ) limit = query_max_limit;

        let previous = req.query.previous;
        let next = req.query.next;
        let only_valid = req.query.only_valid;

        if ( only_valid === 'false' ) {
            only_valid = false;
        } else {
            only_valid = true;
        }

        const errors = validationResult( req );
        if ( !errors.isEmpty() ) {
            return res.status( 422 ).send( { result: { message: 'Invalid input.', errors: errors.array() } } );
        }

        let query = {};

        if ( only_valid ) {
            query.date_start = { $lte: new Date() };
            query.date_end = { $gte: new Date() };
        }

        let result = { result: [] };

        let benefits = await Benefit.paginate( {
            query: query,
            paginatedField: 'date_end',
            fields: list_fields,
            sortAscending: true,
            limit: limit,
            previous: previous,
            next: next
        } );

        if ( benefits && benefits.results ) {
            result = {
                result: benefits.results,
                next: benefits.next,
                previous: benefits.previous,
            };

            if ( !benefits.hasPrevious ) {
                result.previous = null
            }
            if ( !benefits.hasNext ) {
                result.next = null;
            }

            benefits = benefits.results;

            for ( let i = 0; i < benefits.length; i++ ) {
                let benefit = benefits[ i ];
                let event = await Event.findOne( { vorteil: benefit._id, visible: true } );
                benefit.event = event;
            }

            let benefits_sorted = _.sortBy( benefits, 'updated_at' );
            let youngest_benefit = { updated_at: new Date() };

            if ( benefits_sorted.length > 0 ) {
                youngest_benefit = _.last( benefits_sorted );
            }

            res.set( 'Last-Modified', youngest_benefit.updated_at.toUTCString() );
        }

        return res.status( 200 ).send( result );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem listing the benefits." } } );
    }
} );

router.get( '/daterange/:start_date/:end_date', check_limit_is_int_start_date_end_date, async function ( req, res ) {
    try {
        let limit = req.query.limit;
        if ( !limit ) limit = 100;
        limit = parseInt( limit );
        if ( limit > query_max_limit ) limit = query_max_limit;

        let next = req.query.next;
        let previous = req.query.next;

        let start_date = req.params.start_date;
        let end_date = req.params.end_date;

        start_date = moment( start_date, 'YYYY-MM-DD' ).toDate();
        end_date = moment( end_date, 'YYYY-MM-DD' ).toDate();

        const errors = validationResult( req );
        if ( !errors.isEmpty() ) {
            return res.status( 422 ).send( { result: { message: 'Invalid input.', errors: errors.array() } } );
        }

        let result = { result: [] };
        let datequery = build_date_query( start_date, end_date );

        let benefits = await Benefit.paginate( {
            query: datequery,
            paginatedField: 'date_end',
            fields: list_fields,
            sortAscending: true,
            limit: limit,
            previous: previous,
            next: next
        } );

        if ( benefits && benefits.results ) {
            result = {
                result: benefits.results,
                next: benefits.next,
                previous: benefits.previous,
            };

            if ( !benefits.hasPrevious ) {
                result.previous = null
            }
            if ( !benefits.hasNext ) {
                result.next = null;
            }

            benefits = benefits.results;

            for ( let i = 0; i < benefits.length; i++ ) {
                let benefit = benefits[ i ];
                let event = await Event.findOne( { vorteil: benefit._id, visible: true }, { _id: 1 } );
                benefit.event = event;
            }

            let benefits_sorted = _.sortBy( benefits, 'updated_at' );
            let youngest_benefit = { updated_at: new Date() };

            if ( benefits_sorted.length > 0 ) {
                youngest_benefit = _.last( benefits_sorted );
            }

            res.set( 'Last-Modified', youngest_benefit.updated_at.toUTCString() );
        }

        return res.status( 200 ).send( result );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem listing the events." } } );
    }
} );

router.get( '/source/:source', check_limit_is_int_source_is_string, async function ( req, res ) {
    try {
        let limit = req.query.limit;
        if ( !limit ) limit = 100;
        limit = parseInt( limit );
        if ( limit > query_max_limit ) limit = query_max_limit;

        let next = req.query.next;
        let previous = req.query.next;
        let only_valid = req.query.only_valid;

        if ( only_valid === 'false' ) {
            only_valid = false;
        } else {
            only_valid = true;
        }

        let source = req.params.source;

        const errors = validationResult( req );
        if ( !errors.isEmpty() ) {
            return res.status( 422 ).send( { result: { message: 'Invalid input.', errors: errors.array() } } );
        }

        let result = { result: [] };
        let sourcequery = { source: source };

        if ( only_valid ) {
            sourcequery.date_start = { $lte: new Date() };
            sourcequery.date_end = { $gte: new Date() };
        }

        let benefits = await Benefit.paginate( {
            query: sourcequery,
            paginatedField: 'date_end',
            fields: list_fields,
            sortAscending: true,
            limit: limit,
            previous: previous,
            next: next
        } );

        if ( benefits && benefits.results ) {
            result = {
                result: benefits.results,
                next: benefits.next,
                previous: benefits.previous,
            };

            if ( !benefits.hasPrevious ) {
                result.previous = null
            }
            if ( !benefits.hasNext ) {
                result.next = null;
            }

            benefits = benefits.results;

            for ( let i = 0; i < benefits.length; i++ ) {
                let benefit = benefits[ i ];
                let event = await Event.findOne( { vorteil: benefit._id, visible: true }, { _id: 1 } );
                benefit.event = event;
            }

            let benefits_sorted = _.sortBy( benefits, 'updated_at' );
            let youngest_benefit = { updated_at: new Date() };

            if ( benefits_sorted.length > 0 ) {
                youngest_benefit = _.last( benefits_sorted );
            }

            res.set( 'Last-Modified', youngest_benefit.updated_at.toUTCString() );
        }

        return res.status( 200 ).send( result );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem listing the benefits." } } );
    }
} );

router.get( '/sources', async function ( req, res ) {
    try {
        let only_valid = req.query.only_valid;

        if ( only_valid === 'false' ) {
            only_valid = false;
        } else {
            only_valid = true;
        }

        let query = {};

        if ( only_valid ) {
            query.date_start = { $lte: new Date() };
            query.date_end = { $gte: new Date() };
        }

        let sources = await Benefit.distinct( 'source', query );
        sources.sort();
        let result = [];

        _.each( sources, function ( source ) {
            result.push( {
                name: source,
            } );
        } );

        res.status( 200 ).send( { result: result } );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem performing the search." } } );
    }
} );

router.get( '/redeemed', VerifyAccessToken, async function ( req, res ) {
    try {
        let user = await User.findById( req.userId, '-password -__v' );
        if ( !user ) return res.status( 404 ).send( { result: { message: "No user found." } } );

        let redeemed_benefits = await Redeem.find( { user_id: user._id }, '-user_id -__v -_id -created_at' );
        let result = { result: { redeemed_benefits: [] } };

        _.each( redeemed_benefits, function ( redeemed_benefit ) {
            result.result.redeemed_benefits.push( redeemed_benefit.benefit_id );
        } );

        res.status( 200 ).send( result );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem listing the redeemed benefits." } } );
    }
} );

router.get( '/faved', VerifyAccessToken, async function ( req, res ) {
    try {
        let user = await User.findById( req.userId, '-password -__v' );
        if ( !user ) return res.status( 404 ).send( { result: { message: "No user found." } } );

        let result = { result: [] };

        for ( let i = 0; i < user.benefit_favorites.length; i++ ) {
            let benefit_favorite = user.benefit_favorites[ i ];
            let benefit = await Benefit.findById( benefit_favorite );
            let event = await Event.findOne( { vorteil: benefit._id, visible: true } );
            benefit.event = event;

            result.result.push( benefit );
        }

        res.status( 200 ).send( result );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem listing the faved benefits." } } );
    }
} );

router.get( '/:id', async function ( req, res ) {
    try {
        let id = req.params.id;

        let benefit = await Benefit.findById( id );
        if ( !benefit ) return res.status( 404 ).send( { result: { message: 'Benefit not found.' } } );

        let event = await Event.findOne( { vorteil: id, visible: true } );
        benefit.event = event;

        return res.status( 200 ).send( { result: benefit } );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem retrieving the benefit." } } );
    }
} );

router.post( '/:id/fave', VerifyAccessToken, async function ( req, res ) {
    try {
        let user = await User.findById( req.userId, '-password -__v' );
        if ( !user ) return res.status( 404 ).send( { result: { message: "No user found." } } );

        let id = req.params.id;
        let event = await Benefit.findById( id );
        if ( !event ) return res.status( 404 ).send( { result: { message: 'Benefit not found.' } } );

        if ( !_.contains( user.benefit_favorites, id ) ) {
            user.benefit_favorites.push( id );
        }
        await user.save();

        res.status( 204 ).send( {} );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem faving this benefit." } } );
    }
} );

router.post( '/:id/unfave', VerifyAccessToken, async function ( req, res ) {
    try {
        let user = await User.findById( req.userId, '-password -__v' );
        if ( !user ) return res.status( 404 ).send( { result: { message: "No user found." } } );

        let id = req.params.id;
        let benefit = await Benefit.findById( id );
        if ( !benefit ) return res.status( 404 ).send( { result: { message: 'Benefit not found.' } } );

        if ( _.contains( user.benefit_favorites, id ) ) {
            user.benefit_favorites = _.without( user.benefit_favorites, id );
        }

        await user.save();

        res.status( 204 ).send( {} );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem unfaving this benefit." } } );
    }
} );

router.post( '/:id/redeem', VerifyAccessToken, async function ( req, res ) {
    try {
        let user = await User.findById( req.userId, '-password -__v' );
        if ( !user ) return res.status( 404 ).send( { result: { message: "No user found." } } );

        let id = req.params.id;
        let benefit = await Benefit.findById( id );
        if ( !benefit ) return res.status( 404 ).send( { result: { message: 'Benefit not found.' } } );

        let annotation = req.body.annotation;

        let existing_redeem = await Redeem.findOne( { user_id: user._id, benefit_id: benefit._id } );
        if ( existing_redeem ) return res.status( 409 ).send( { result: { message: 'Benefit was already redeemed.' } } );

        await Redeem.create( {
            user_id: user._id,
            benefit_id: benefit._id,
            annotation: annotation,
            created_at: new Date()
        } );

        await send_redeem_email( user, benefit, annotation );

        res.status( 204 ).send( {} );
    } catch ( error ) {
        console.error( error );
        return res.status( 500 ).send( { result: { message: "There was a problem redeeming this benefit." } } );
    }
} );

function build_date_query( start_date, end_date ) {
    return {
        $or: [
            {
                $and: [
                    { date_start: { $lte: start_date } },
                    { date_end: { $gte: end_date } }
                ]
            },
            {
                $and: [
                    { date_start: { $gte: start_date } },
                    { date_end: { $lte: end_date } }
                ]
            },
            {
                $and: [
                    { date_start: { $gte: start_date } },
                    { $or: [ { date_end: { $gte: end_date } }, { date_end: null } ] },
                    { date_start: { $lte: end_date } }
                ]
            },
            {
                $and: [
                    { date_start: { $lte: start_date } },
                    { date_end: { $gte: start_date } },
                    { date_end: { $lte: end_date } }
                ]
            }
        ]
    };
}

async function send_redeem_email( user, benefit, annotation ) {
    let from = 'SWE App Middleware <wlatickets@gmail.com>';

    let recipient = benefit.contact.email.toLowerCase();
    let name = user.name;
    let user_email = user.email;
    let vorteil = escape_double_quotes( benefit.title );
    let einloesung = moment().format( 'DD.MM.YYYY HH:mm' );
    let swe_energie = user.identifier_energie;
    let evag_abo = user.identifier_evag_abo;
    let evag_chip = user.identifier_evag_card;
    let egapark = user.identifier_egapark;
    let subject = '[SWE App] Vorteil eingeloest: ' + vorteil;
    let replyTo = user_email;

    let text = 'Name: ' + name + '\nEmail: ' + user_email + '\nVorteil: ' + vorteil + '\nEinlösung: ' + einloesung + '\nZusatzangabe: ' + annotation + '\nKundennummer SWE Energie: ' + swe_energie + '\nEVAG Abonummer: ' + evag_abo + '\nEVAG Chipkartennummer: ' + evag_chip + '\negapark Saisonkartennummer: ' + egapark;

    let mail = new MailComposer( {
        subject: '[SWE App] Vorteil eingeloest: ' + vorteil,
        text: text,
        replyTo: user_email
    } );

    let filename_mail = 'benefit/mail_' + new Date().getTime() + '.txt';
    let filename_encrypted_mail = 'benefit/mail_encrypted_' + new Date().getTime() + '.txt';
    let certificate_path = 'benefit/' + recipient + '.pem';

    mail.compile().build( async function ( err, message ) {
        fs.writeFileSync( filename_mail, message.toString() );
        const { stdout, stderr } = await exec( 'openssl smime -encrypt -in ' + filename_mail + ' -out ' + filename_encrypted_mail + ' -from "' + from + '" -to "' + recipient + '" -subject "' + subject + '" ' + certificate_path );

        let path = filename_mail;

        if ( recipient.toLowerCase().includes( 'vorteile' ) ) {
            path = filename_encrypted_mail;
        }

        let encrypted_email_data = fs.readFileSync( filename_encrypted_mail ).toString().split( '\n' );
        encrypted_email_data.splice( 2, 0, 'Reply-To: ' + replyTo );
        let text = encrypted_email_data.join( '\n' );

        fs.writeFileSync( filename_encrypted_mail, text );

        let mailOptions = {
            envelope: {
                from: from,
                to: recipient,
            },
            raw: {
                path: path
            }
        };

        transporter.sendMail( mailOptions, function ( error, info ) {
            if ( error ) {
                return console.log( error );
            }
            console.log( 'Message sent: ' + info.response );
            fs.unlinkSync( filename_mail );
            fs.unlinkSync( filename_encrypted_mail );
        } );
    } );

}

function escape_double_quotes( str ) {
    return str.replace( /\\([\s\S])|(")/g, "\\$1$2" );
}

module.exports = router;
