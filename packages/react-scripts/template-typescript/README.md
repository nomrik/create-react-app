## Overview

This project is a fork of [create-react-app](https://github.com/facebook/create-react-app), that is meant to be used to bootstrap a React project inside Salesforce, via Visualforce page integration. Please refer to the main repo for any information and help, other than the details below.

## Quick start

Run the following command from a terminal:

`npx create-react-app <your-project-name> --scripts-version react-scripts-sf`

> More information on [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b)

This will create a CRA React project, with several Salesforce specific files added:

- **sfConfig.js** - this file is a local untracked file, that stores the Salesforce configuration. It has the following fields:

  - **SF_USERNAME** - your username
  - **SF_PASSWORD** - your password
  - **SF_TOKEN** - your security token. If you don't have one, follow [this link](https://help.salesforce.com/apex/HTViewHelpDoc?id=user_security_token.htm)
    **SF_CONTROLLER_NAME** - the name of the Apex controller you want to use with your app
    > Note: you will still be able to call methods from multiple controllers

- **src/callRemote.js** - this is a utility function to interact with your Apex controller. To use it, simply import it to any file, and call it with the methodName (including its controller name) as the first argument, and an array of parameters as the second argument. It will return a Promise with the response from your controller.

  Example usage:

  ```javascript
  import callRemote from './callRemote';

  async function logAllUsers() {
    const users = await callRemote('MyController.getUsers');
    console.log(users); // [{ Name: '..', Id: '..' }, { Name: '..', Id: '..' }
  }

  async function logUser(name) {
    const user = await callRemote('MyController.getUserByName', name);
    console.log(user); // { Name: '..', Id: '..' }
  }
  ```

  Or inside a React component:

  ```javascript
  class MyComponent extends React.Component {
    constructor(props) {
      super(props);
      this.state = { users: [] };
    }

    async componentDidMount() {
      const users = await callRemote('MyController.getUsers');
      this.setState({ users });
    }
  }
  ```

- **public/index.page** - this is the Visualforce page. It will be automatically deployed to Salesforce (in the next section of this document), with all the values filled in from the configuration file. You can customize other aspects of the page here manually.

## Deployment

There are two additional scripts to this package:

- `build_deploy` - builds the project, deploys it as a static resource (by the name of the project), and finally deploys the Visualforce page.
- `deploy` - same as `build_deploy`, but does not build the project, only deploys.

As a starting point, run `yarn build_deploy` from the project's root. You can then open and preview the Visualforce page in Salesforce, and you will see the app. After the initial deployment, you can begin developing locally.

## Running locally

In order to run the app locally, a tunneling tool such as [ngrok](https://ngrok.com/) needs to be utilized. After you installed `ngrok`, follow these steps to run the app locally:

- Run `yarn start` from the project's root. This will start the webpack devserver on port 3000 (you can change the port if you wish)
- From a separate terminal, navigate to the folder you installed `ngrok` and run `ngrok http 3000`. This will start a tunnel, forwarding network requests to your `localhost`
- Copy the first hash in your ngrok address (will show up in the terminal), and paste it instead of the `YOUR_NGROK` placeholder in the **deployed** Visualforce page (through the developer console/IDE)
- Uncomment the tags under `<!--Dev-->` and comment the ones under `<!--Prod>`
- You should now be able to see the app if you preview the Visualforce page. If you make changes to the app, your local devserver will recompile the app, and you can refresh the browser in the Visualforce page and witness your changes.

**IMPORTANT: before you try and run the app locally, you have to deploy at least once in order to have the Visualforce page in your Salesforce org**

## Issues

Please note any issues you are having in the [issues](https://github.com/nomrik/create-react-app/issues) page.
