const paths = require('../config/paths');
const sfConfig = require(paths.sfConfig);
const appName = require(paths.appPackageJson).name;

const gulp = require('gulp');
const zip = require('gulp-zip');
const replace = require('gulp-replace');
const through2 = require('through2');
const jsforce = require('jsforce');

const username = sfConfig.SF_USERNAME;
const password = sfConfig.SF_PASSWORD;
const token = sfConfig.SF_TOKEN;
const loginUrl = 'https://test.salesforce.com';

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

const forceDeploy = ({ type = 'StaticResource' }) => {
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
          }
        } else {
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

deployApp = () =>
  gulp
    .src('build/static/**/*')
    .pipe(zip(`${appName}.zip`))
    .pipe(
      forceDeploy({
        type: 'StaticResource',
      })
    )
    .on('end', () => deployVisualforce());

deployVisualforce = () =>
  gulp
    .src('build/index.page')
    .pipe(replace('{STATIC_RESOURCE_NAME}', appName))
    .pipe(replace('{CONTROLLER_NAME}', sfConfig.SF_CONTROLLER_NAME))
    .pipe(
      forceDeploy({
        type: 'ApexPage',
      })
    );

deployApp();
