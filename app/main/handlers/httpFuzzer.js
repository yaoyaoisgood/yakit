const {ipcMain} = require("electron");


module.exports = (win, getClient) => {
    ipcMain.handle("string-fuzzer", (e, params) => {
        getClient().StringFuzzer({Template: params.template}, (err, data) => {
            if (win) {
                win.webContents.send(params.token, {
                    error: err,
                    data: err ? undefined : {
                        Results: (data || {Results: []}).Results.map(i => {
                            return i.toString()
                        })
                    },
                })
            }
        })
    })

    const handlerHelper = require("./handleStreamWithContext");
    const streamHTTPFuzzerMap = new Map();
    ipcMain.handle("cancel-HTTPFuzzer", handlerHelper.cancelHandler(streamHTTPFuzzerMap));
    ipcMain.handle("HTTPFuzzer", (e, params, token) => {
        let stream = getClient().HTTPFuzzer(params);
        stream.on("data", data => {
            if (win && data) win.webContents.send(`fuzzer-data-${token}`, data)
        });
        stream.on("error", err => {
            if (win && err) win.webContents.send(`fuzzer-error-${token}`, err.details)
        })
        stream.on("end", data => {
            if (win && data) win.webContents.send(`fuzzer-end-${token}`)
        })
        handlerHelper.registerHandler(win, stream, streamHTTPFuzzerMap, token)
    })


    ipcMain.handle("analyze-fuzzer-response", (e, rsp, flag) => {
        getClient().ConvertFuzzerResponseToHTTPFlow(rsp, (err, req) => {
            if (err && win) {
                win.webContents.send(`ERROR:${flag}`, err?.details || "unknown")
            }

            if (req && win) {
                win.webContents.send(flag, req)
            }
        })
    })

    // asyncHTTPRequestMutate wrapper
    const asyncHTTPRequestMutate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPRequestMutate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPRequestMutate", async (e, params) => {
        return await asyncHTTPRequestMutate(params)
    })

    // asyncRedirectRequest wrapper
    const asyncRedirectRequest = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RedirectRequest(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RedirectRequest", async (e, params) => {
        return await asyncRedirectRequest(params)
    })
}