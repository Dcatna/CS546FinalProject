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

Handlebars.registerHelper("is_user", (userId, curr_user, options) => {
  if (userId === curr_user) {
    return options.fn(this);
  }
  
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifEmptyComments', function(courseComments, facultyComments, options) {
    if (courseComments.length === 0 && facultyComments.length === 0) {
        return options.fn(this); 
    } else {
        return options.inverse(this); 
    }
});



app.use(
  session({
    secret: "This is a secret.. shhh don't tell anyone",
    saveUninitialized: false,
    resave: false
  })
);

// from lecture code to support deletion of comments
const rewriteUnsupportedBrowserMethods = (req, res, next) => {
  // If the user posts to the server with a property called _method, rewrite the request's method
  // To be that method; so if they post _method=PUT you can now allow browsers to POST to a route that gets
  // rewritten in this middleware to a PUT route
  if (req.body && req.body._method) {
    req.method = req.body._method;
    delete req.body._method;
  }

  // let the next middleware run:
  next();
};
app.use(rewriteUnsupportedBrowserMethods);

constructorMethod(app)

app.listen(3000, () => {
    console.log("Server is running on 3000")
})


