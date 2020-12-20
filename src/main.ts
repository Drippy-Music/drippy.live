import Vue from 'vue'

import App from '@/App.vue'
import router from '@/router'

import player from '@/modules/web-player'
import drippy, { user } from '@/modules/drippy-api'
import { Message, Utils } from '@/modules/utils'

import '@/plugins/validation-rules'
import '@/styles/drippy.scss'

Vue.config.productionTip = false;

Vue.mixin({
    data: () => ({ Utils, breakpoints: Utils.$breakpoints }),
    computed: {
        $user: { get: () => user },
        $drippy: { get: () => drippy },
        $player: { get: () => player }
    },
    methods: {
        notify(message: Message) {
            this.$root.$emit('toast', message);
        }
    }
});

drippy.validate().then(() => user.initialize())
    .catch((error) => {
        if (error.response || error.message === 'User not authenticated') {
            if (!window.location.pathname.startsWith('/auth'))
                router.push({ name: 'login' })
        }
    }).finally(() =>
        new Vue({ router, render: h => h(App) })
            .$mount('#app')
    );