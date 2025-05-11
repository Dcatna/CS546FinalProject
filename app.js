import express from 'express'
import constructorMethod from './routes/index.js'
import exphbs from 'express-handlebars';
import session from 'express-session';
import Handlebars from 'handlebars'
import path from 'path';

const app = express()

app.use('/public', express.static('public'));

app.use(express.json())
app.use(express.urlencoded({extended: true}));
app.engine('handlebars', exphbs.engine({defaultLayout: 'main', partialsDir: path.resolve('views/partials/')}));
app.set('view engine', 'handlebars');

Handlebars.registerHelper("isLoggedIn", function(session){
  return session && session.user;
});

app.use(
  session({
    secret: "This is a secret.. shhh don't tell anyone",
    saveUninitialized: false,
    resave: false
  })
);
constructorMethod(app)

app.listen(3000, () => {
    console.log("Server is running on 3000")
})


