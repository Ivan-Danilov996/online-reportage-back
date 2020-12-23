const http = require('http');
const Koa = require('koa');
const app = new Koa();
const uuid = require('uuid');
const { streamEvents } = require('http-event-stream');

const Router = require('koa-router');
const router = new Router();


app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
        return await next();
    }
    const headers = { 'Access-Control-Allow-Origin': '*', };
    if (ctx.request.method !== 'OPTIONS') {
        ctx.response.set({ ...headers });
        try {
            return await next();
        } catch (e) {
            e.headers = { ...e.headers, ...headers };
            throw e;
        }
    }
    if (ctx.request.get('Access-Control-Request-Method')) {
        ctx.response.set({
            ...headers,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
        });
        if (ctx.request.get('Access-Control-Request-Headers')) {
            ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Allow-Request-Headers'));
        }
        ctx.response.status = 204; // No content
    }

});

const actions = []

let count = 1;

function getActions(probability) {
    probability = probability /1000
    if (count) {
        count = 0;
        return JSON.stringify({
            type: 'start',
            text: 'Игра началась',
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        })
    } else {
        if (probability <= 5) {
            return JSON.stringify({
                type: 'action',
                text: 'Идёт перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            })
        } else if (probability > 5 && probability <= 9) {
            return JSON.stringify({
                type: 'freekick',
                text: 'Нарушение правил, будет штрафной удар',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            })
        } else {
            return JSON.stringify({
                type: 'goal',
                text: 'Отличный удар! И Г-О-Л!',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            })
        }
    }
}

function getRandom() {
    return Math.random() * 10000
}

let time = getRandom() 

router.get('/actions', async (ctx) => {
    if (actions) {
        ctx.body = JSON.stringify(actions)
    }
    return
})

router.get('/sse', async (ctx) => {
    streamEvents(ctx.req, ctx.res, {
        async fetch(lastEventId) {
            console.log(lastEventId);
            return [];
        },
        stream(sse) {
            
            const interval = setInterval(() => {
                const action = getActions(time)
                actions.push(action)
                if (actions.length >= 50) {
                    clearInterval(interval)
                }
                sse.sendEvent({ data: action });
                time = getRandom()
                }, time);
                return () => clearInterval(interval);
        }
    });
    ctx.respond = false; // koa не будет обрабатывать ответ
});
app.use(router.routes()).use(router.allowedMethods());




const port = process.env.PORT || 7070;
const server = http.createServer(app.callback()).listen(port)

