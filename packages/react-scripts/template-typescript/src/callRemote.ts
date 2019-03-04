function callRemote(methodName: string = '', params: string[] = []) {
  const vf = (<any>window).Visualforce;
  if (!vf) {
    throw new Error('Could not find VisualForce');
  }

  return new Promise((resolve?: Function, reject?: Function) => {
    vf.remoting.Manager.invokeAction(
      methodName,
      ...params,
      (result: any, event: any) => {
        if (event.status) {
          resolve && resolve(result);
        } else {
          reject && reject(result);
        }
      },
      {
        buffer: false,
        escape: false,
      }
    );
  });
}

export default callRemote;
