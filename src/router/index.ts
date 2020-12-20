import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import Home from '@/views/Home.vue'

import Auth from '@/views/auth/Auth.vue'
import Login from '@/views/auth/Login.vue'
import Spotify from '@/views/auth/Spotify.vue'

import Search from '@/views/home/search/Search.vue'
import Library from '@/views/home/collection/Library.vue'

import Artist from '@/views/artist/Artist.vue'
import Album from '@/views/albums/Album.vue'
import Track from '@/views/tracks/Track.vue'
import Playlist from '@/views/playlists/Playlist.vue'

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
    {
        path: '/',
        component: Home,
        children: [
            {
                path: '',
                name: 'library',
                component: Library
            },
            {
                props: true,
                path: 'search',
                name: 'search',
                component: Search
            },
            {
                path: 'artist/:id',
                name: 'artist',
                component: Artist
            },
            {
                path: 'album/:id',
                name: 'album',
                component: Album
            },
            {
                path: 'track/:id',
                name: 'track',
                component: Track
            },
            {
                path: 'playlist/:id',
                name: 'playlist',
                component: Playlist
            }
        ]
    },
    {
        path: '/auth',
        name: 'auth',
        component: Auth,
        children: [
            {
                path: 'login',
                name: 'login',
                component: Login
            },
            {
                path: 'spotify',
                name: 'spotify',
                component: Spotify
            }
        ]
    }
];

export default new VueRouter({ mode: 'history', base: process.env.BASE_URL, routes });