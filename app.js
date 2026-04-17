const City = require('./models/city');
const Country = require('./models/country');

// Express
const express = require('express');
const {body, validationResult} = require('express-validator');
const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Swagger - Génération de la doc de l'API
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger_output.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

// Auth - JWT
const jwt = require('jsonwebtoken');
const { SECRET } = require('./env.js');

// Mock
async function dbReset() {
    // Nettoyer les deux tables
    await City.deleteMany();
    await Country.deleteMany();

    // Ajouter 3 pays
    const france = new Country({
        name: 'France',
        code: 'FR',
        uuid: crypto.randomUUID(),
        europeanUnion: true,
    });
    await france.save();

    const espagne = new Country({
        name: 'Espagne',
        code: 'ES',
        uuid: crypto.randomUUID(),
        europeanUnion: true,
    });
    await espagne.save();

    const royaumeUni = new Country({
        name: 'Royaume-Uni',
        code: 'UK',
        uuid: crypto.randomUUID(),
        europeanUnion: false,
    });
    await royaumeUni.save();

    const rennes = new City({
        name: 'Rennes',
        uuid: crypto.randomUUID(),
        country: france._id,
        population: 200000,
    });

    const londres = new City({
        name: 'Londres',
        uuid: crypto.randomUUID(),
        country: royaumeUni._id,
        population: 9000000,
    });

    const barcelone = new City({
        name: 'Barcelone',
        uuid: crypto.randomUUID(),
        country: espagne._id,
        population: 12000000,
    });

    const paris = new City({
        name: 'Paris',
        uuid: crypto.randomUUID(),
        country: france._id,
        population: 11000000,
    });

    await rennes.save();
    await londres.save();
    await barcelone.save();
    await paris.save();

    await City.aggregate([
        {
            $lookup: { // sert à faire la jointure
                from: 'countries',
                localField: 'country',
                foreignField: '_id',
                as: 'country'
            },
        },
        {$unwind: '$country'}, // transforme la jointure en objet exploitable
        {$match: {'country.europeanUnion': true}},
        {
            $project: {
                _id: 0,
                country: '$country.name',
                name: 1,
            },
        },
        {
            $sort: {
                population: -1 // Trier par population DESC
            }
        }
    ]).then((cities) => {
        console.log('Villes en union européenne :', cities);
    });

    await City.aggregate([
        { $group: { _id: '$country', population: { $sum: '$population' } } },
        { $lookup: { from: 'countries', localField: '_id', foreignField: '_id', as: 'country' } },
        { $unwind: '$country' },
        { $project: { _id: 0, country: '$country.name', population: 1 } },
    ]).then((cities) => {
        console.log('Population par pays', cities);
    });
}

// dbReset();

// Utilisateur
const users = [
    {
        id: 1,
        username: "admin",
        password: "admin",
    },
];

// Middleware
app.use((req, res, next) => {
    console.log('method: ', req.method, ' url: ', req.url, ' user-agent: ', req.get('User-Agent'));
    next();
});

// Route post pour gérer la connexion utilisateur
app.post('/auth',
    async (req, res, next) => {
    const user = users.find((u) => u.username === req.body.username && u.password === req.body.password);
        if (!user) {
            return res.status(400).json({ message: 'Mauvais utilisateur' });
        }
        // Sinon l'utilisateur a été trouvé, donc on construit le token
        const token = jwt.sign({
            id: user.id,
            username: user.username,
        }, SECRET,
            { expiresIn: '3 hours' }
        );
        return res.json({ access_token: token });
    });

function extractToken(headerValue) {
    if (typeof headerValue !== "string") {
        return false;
    }
    const matches = headerValue.match(/(bearer)\s+(\S+)/i);
    return matches && matches[2]; // on verifie qu'il y a un bearer token et on prend la valeur du token
}

function checkTokenMiddleware(req, res, next) {
    const token = req.header.authorization && extractToken(req.header.authorization)

    if (!token) {
        return res.status(401).json({ message: "Erreur: besoin d'un token" })
    }

    jwt.verify(token, SECRET, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ message: "Erreur: mauvais token" });
        } else {
            return next();
        }
    });
}

// ------------ PAYS --------------//
// Route principale qui permet d'afficher les pays
app.get('/countries', async (req, res) => {
    const countries = await Country.find();
    res.json(countries);
});

// CRUD - CREATE nouveau Pays
app.post('/countries', checkTokenMiddleware,
    body('name')
        .isLength({min: 3})
        .withMessage('Le Pays doit avoir au moins 3 caractères'),
    body('code')
        .notEmpty()
        .withMessage('Le code pays est obligatoire'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json(errors);
        }

        const generatedUuid = crypto.randomUUID();

        await Country.create({
            name: req.body.name,
            code: req.body.code,
            uuid: generatedUuid,
        }).then((country) => {
            res.status(201).json(country);
        });
    });

// Afficher un pays en détail
app.get('/countries/:code', async (req, res) => {
    await Country.findOne({code: req.params.code}).then((country) => {
        res.status(200).json(country);
    });
});

// CRUD - UPDATE le pays par le code
app.put('/countries/updateByCode/:code', async (req, res) => {
    console.log('body', req.body);

    await Country.findOneAndUpdate(
        {code: req.params.code},
        {name: req.params.name},
    ).then((country) => res.status(200).json(country));
});

// CRUD - UPDATE le pays par le uuid
app.put('/countries/updateById/:uuid', async (req, res) => {
    console.log('body', req.body);

    await Country.findOneAndUpdate(
        {uuid: req.params.uuid},
        {name: req.params.name},
        {new: true},
    ).then((country) => res.status(200).json(country));
});

// CRUD - DELETE pays
app.delete('/countries/:code', async (req, res) => {
    await Country.findOneAndDelete(
        {code: req.params.code},
    ).then((response) => {
        res.status(200).json(response);
    });
});

// ---------- VILLES ------------//

app.get('/cities', (req, res) => {
    console.log('test')
    City.find()
        .then((cities) => {
            console.log('cities', cities);

            res.json(cities);
        });
});

// CRUD - CREATE
app.post('/cities', body('name')
        .isLength({min: 3})
        .withMessage('La ville doit avoir au moins 3 caractères'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json(errors);
        }
        await City.create({
            name: req.body.name,
            uuid: crypto.randomUUID(),
        });

        await City.find({name: req.body.name})
            .then((city) => res.json(city));
    },
);

app.get('./cities/:uuid', (req, res) => {
    City.findOne({uuid: req.params.uuid}).then((city) => {
        if (city) {
            res.send(city.name);
        } else {
            res.status(404).send('Ville non trouvée');
        }
    });
});

app.post('/cities/update', async (req, res) => {
    await City.findOneAndUpdate(
        {uuid: req.params.uuid},
        {name: req.params.name},
    );
    res.redirect('/cities');
});

// Erreur si page non existante
app.use((req, res) => {
    res.status(404).send("Page non trouvée");
})

// EXPORT
module.exports = app;