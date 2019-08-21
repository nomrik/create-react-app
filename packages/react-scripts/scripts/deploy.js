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
const tunnelName = `${appName}-ngrok-tunnel`;
const { dev } = argv;

const resourceName = sfConfig.VF_NAME;

const buildMeta = ({ type, file, isDev }) => {
  switch (type) {
    case 'StaticResource':
      return {
        fullName: isDev || dev ? resourceName : appName,
        content: file.contents.toString('base64'),
        contentType: 'application/zip',
        cacheControl: 'public',
      };
    case 'ApexPage':
      return {
        fullName: isDev || dev ? resourceName : appName,
        content: file.contents.toString('base64'),
        apiVersion: '45.0',
        label: isDev || dev ? resourceName : appName,
      };
  }
};

const forceDeploy = ({ type = 'StaticResource', isDev, ngrokUrl }) => {
  return through2.obj(function(file, enc, cb) {
    const emit = this.emit.bind(this);
    const conn = new jsforce.Connection({
      loginUrl,
    });
    const meta = [buildMeta({ type, file, isDev: isDev || dev })];
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
              `\nDeployed React application (${
                isDev || dev ? resourceName : appName
              }) successfully`
            );
          } else if (type === 'ApexPage') {
            console.log(
              `\nDeployed Visualforce page (${
                isDev || dev ? resourceName : appName
              }) successfully`
            );
            if (isDev || dev) {
              console.log('\nRunning ngrok at: ' + ngrokUrl);
            }
          }
        } else {
          if (type === 'ApexPage') {
            console.log(file.contents.toString());
          }
          console.log(
            `\nErrors in deploying ${type} (${
              isDev || dev ? resourceName : appName
            }): `,
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
    const api = ngrok.getApi();
    if (api) {
      const tunnelsJson = await api.get('api/tunnels');
      const { tunnels } = JSON.parse(tunnelsJson);
      const tunnel = tunnels.find(tunnel => tunnel.name === tunnelName);
      if (tunnel) {
        url = tunnel.public_url;
      } else {
        url = await ngrok.connect({
          addr: port,
          name: tunnelName,
        });
      }
    } else {
      url = await ngrok.connect({
        addr: port,
        name: tunnelName,
      });
    }
  }
  return new Promise((resolve, reject) => {
    gulp
      .src(isDev ? paths.devVisualForce : paths.prodVisualForce)
      .pipe(
        replace('{STATIC_RESOURCE_NAME}', isDev || dev ? resourceName : appName)
      )
      .pipe(replace('{CONTROLLER_NAME}', sfConfig.SF_CONTROLLER_NAME))
      .pipe(replace('<link href', '<apex:stylesheet value'))
      .pipe(replace('rel="stylesheet"', ''))
      .pipe(
        replace(
          isDev ? '/static/' : /"\/static\/((?:css|js)\/.*?.(?:css|js))"/g,
          isDev
            ? url + '/static/'
            : (match, fileName) =>
                `"{!URLFOR($Resource.${appName}, '${fileName}')}"`
        )
      )
      .pipe(
        forceDeploy({
          type: 'ApexPage',
          isDev: isDev || dev,
          ngrokUrl: url,
        })
      )
      .on('error', reject)
      .on('end', resolve);
  });
}

function deployApp() {
  return gulp
    .src(paths.appBuild + '/static/**/*')
    .pipe(zip(`${dev ? resourceName : appName}.zip`))
    .pipe(
      forceDeploy({
        type: 'StaticResource',
      })
    );
}

exports.deployVisualforce = deployVisualforce;

if (require.main === module) {
  gulp.series(deployApp, deployVisualforce)();
}
