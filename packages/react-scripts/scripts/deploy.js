const paths = require('../config/paths');
const sfConfig = require(paths.sfConfig);
const appName = require(paths.appPackageJson).name;
const argv = require('yargs').argv;

const gulp = require('gulp');
const zip = require('gulp-zip');
const replace = require('gulp-replace');
const through2 = require('through2');
const jsforce = require('jsforce');
const ngrok = require('ngrok');

const username = sfConfig.SF_USERNAME;
const password = sfConfig.SF_PASSWORD;
const token = sfConfig.SF_TOKEN;
const loginUrl = 'https://test.salesforce.com';
const { dev } = argv;

const buildMeta = ({ type, file }) => {
  switch (type) {
    case 'StaticResource':
      return {
        fullName: appName,
        content: file.contents.toString('base64'),
        contentType: 'application/zip',
        cacheControl: 'public',
      };
    case 'ApexPage':
      return {
        fullName: appName,
        content: file.contents.toString('base64'),
        apiVersion: '45.0',
        label: appName,
      };
  }
};

const forceDeploy = ({ type = 'StaticResource', isDev, ngrokUrl }) => {
  return through2.obj(function(file, enc, cb) {
    const emit = this.emit.bind(this);
    const conn = new jsforce.Connection({
      loginUrl,
    });
    const meta = [buildMeta({ type, file })];
    conn.login(username, password + token, function(err, userInfo) {
      if (err) {
        console.error(err);
      }
      conn.metadata.upsert(type, meta, function(err, result) {
        if (err) {
          console.error(err);
          return cb(new Error('Deploy failed.'));
        }
        if (result.success) {
          if (type === 'StaticResource') {
            console.log(
              `\nDeployed React application (${appName}) successfully`
            );
          } else if (type === 'ApexPage') {
            console.log(
              `\nDeployed Visualforce page (${appName}) successfully`
            );
            if (isDev) {
              console.log('\nRunning ngrok at: ' + ngrokUrl);
            }
          }
        } else {
          if (type === 'ApexPage') {
            console.log(file.contents.toString());
          }
          console.log(
            `\nErrors in deploying ${type} (${appName}): `,
            result.errors
          );
        }
        emit('end');
        return cb(null, file);
      });
    });
  });
};

async function deployVisualforce(cb, isDev = false, port = 3000) {
  let url = '{NGROK_URL}';
  if (isDev || dev) {
    url = await ngrok.connect(port);
  }
  return new Promise((resolve, reject) => {
    gulp
      .src('build/index.page')
      .pipe(replace('{STATIC_RESOURCE_NAME}', appName))
      .pipe(replace('{PROD_SCRIPT_TAG_START}', isDev ? '!--script' : 'script'))
      .pipe(replace('{DEV_SCRIPT_TAG_START}', isDev ? 'script' : '!--script'))
      .pipe(replace('{PROD_SCRIPT_TAG_END}', isDev ? '--' : ''))
      .pipe(replace('{DEV_SCRIPT_TAG_END}', isDev ? '' : '--'))
      .pipe(replace('{PROD_STYLE_TAG_START}', isDev ? '!--apex' : 'apex'))
      .pipe(replace('{DEV_STYLE_TAG_START}', isDev ? 'apex' : '!--apex'))
      .pipe(replace('{PROD_STYLE_TAG_END}', isDev ? '--' : ''))
      .pipe(replace('{DEV_STYLE_TAG_END}', isDev ? '' : '--'))
      .pipe(replace('{CONTROLLER_NAME}', sfConfig.SF_CONTROLLER_NAME))
      .pipe(replace('{NGROK_URL}', url))
      .pipe(
        forceDeploy({
          type: 'ApexPage',
          isDev: dev,
          ngrokUrl: url,
        })
      )
      .on('end', resolve);
  });
}

function deployApp() {
  return gulp
    .src('build/static/**/*')
    .pipe(zip(`${appName}.zip`))
    .pipe(
      forceDeploy({
        type: 'StaticResource',
      })
    );
}

exports.deployVisualforce = deployVisualforce;

gulp.series(deployApp, deployVisualforce)();
