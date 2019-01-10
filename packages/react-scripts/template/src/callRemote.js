function callRemote(methodName, params) {
    const vf = window.Visualforce;
    if (!vf) {
        throw new Error('Could not find VisualForce');
    }

    return new Promise((resolve, reject) => {
        vf.remoting.Manager.invokeAction(
            methodName,
            ...params,
            (result, event) => {
                if (event.status) {
                    resolve(JSON.parse(result))
                }
            },
            {
                buffer: false,
                escape: false
            }
        );
    });
}

export default callRemote;