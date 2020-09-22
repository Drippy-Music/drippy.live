import { EventEmitter } from 'events';
import drippy from '@/modules/drippy-api'

const audio = new Audio();

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 512;

const context = canvas.getContext('2d');
const video = document.createElement('video');
video.muted = true;

function getArtworks(track: any): MediaImage[] {
    return track['album'].images.map((e: any) => ({
        src: e['url'],
        sizes: `${e['width']}x${e['height']}`,
        type: 'image/jpg'
    }));
}

function random(index: number, max: number, exclude: number[]): number {
    if (max < exclude.length) {
        return -1;
    }

    const value = Math.floor(Math.random() * (+max + 1));
    if (exclude.includes(value) || (value === index + 1 && max !== exclude.length)) {
        return random(index, max, exclude);
    }

    return value;
}

class Thumbnail extends Image {

    constructor(media: MediaImage) {
        super();
        this.crossOrigin = 'true';
        this.src = media.src;
    }

}

export enum State {

    Idle, Paused, Playing

}

export enum Mode {

    RepeatNone, RepeatAll, RepeatOnce

}

export enum ShuffleMode {

    ShuffleOff = 0, ShuffleOn = 1

}

export enum Volume {

    VolumeHigh, VolumeMedium, VolumeLow, Muted

}

export class Player extends EventEmitter {

    public static readonly Instance = new Player();

    private _index: number = 0;
    private _playlist: any[] = [];
    private _indexes: number[] = [];
    private _state: State = State.Idle;
    private _mode: Mode = Mode.RepeatNone;
    private _shuffle: ShuffleMode = ShuffleMode.ShuffleOff;
    private _volume: Volume = Volume.VolumeHigh;

    private constructor() {
        super();
        audio.addEventListener('timeupdate', () => {
            Player.Instance.emit('update-time', audio.currentTime);
        });

        audio.addEventListener('play', () => {
            Player.Instance._state = State.Playing;
            Player.Instance.emit('update-state');
        });

        audio.addEventListener('pause', () => {
            Player.Instance._state = State.Paused;
            Player.Instance.emit('update-state');
        });

        audio.addEventListener('loadeddata', () => {
            audio.play().then(async () => {
                const track = Player.Instance.playlist[Player.Instance.index];
                Player.Instance.emit('playback-started', track, Player.Instance.index);

                if (navigator.mediaSession && context) {
                    const duration = Math.floor(track['duration_ms'] / 1000);
                    function updatePositionState() {
                        (navigator.mediaSession as any).setPositionState({
                            position: audio.currentTime,
                            playbackRate: audio.playbackRate,
                            duration
                        });
                    }

                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: track['name'],
                        artist: track['artists'][0].name,
                        album: track['album'].name,
                        artwork: getArtworks(track)
                    });

                    updatePositionState();
                    navigator.mediaSession.setActionHandler('play', () => audio.play());
                    navigator.mediaSession.setActionHandler('pause', () => audio.pause());

                    navigator.mediaSession.setActionHandler('previoustrack', () => {
                        Player.Instance.play(Player.Instance.index - 1)
                    });

                    navigator.mediaSession.setActionHandler('nexttrack', () => {
                        Player.Instance.play(Player.Instance.index + 1)
                    });

                    navigator.mediaSession.setActionHandler('seekbackward', () => {
                        audio.currentTime = Math.max(audio.currentTime - 10, 0);
                        updatePositionState();
                    });

                    navigator.mediaSession.setActionHandler('seekforward', () => {
                        audio.currentTime = Math.min(audio.currentTime + 10, duration);
                        updatePositionState();
                    });

                    (navigator.mediaSession as any).setActionHandler('seekto', (event: any) => {
                        if (event.fastSeek && "fastSeek" in audio) {
                            audio.fastSeek(event.seekTime);
                        } else {
                            audio.currentTime = event.seekTime;
                        }
                        updatePositionState();
                    });


                    if (!video.readyState)
                        video.srcObject = (canvas as any).captureStream();

                    const image = new Thumbnail(navigator.mediaSession.metadata.artwork[0]);
                    await image.decode();

                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                }
            });
        });

        audio.addEventListener('ended', () => {
            if (Player.Instance._mode == Mode.RepeatOnce) {
                Player.Instance._mode = Mode.RepeatNone;
                return Player.Instance.play(Player.Instance._index);
            }

            const index: number = (() => {
                if (Player.Instance._shuffle == ShuffleMode.ShuffleOff) {
                    return Player.Instance._index + 1;
                }

                return random(
                    Player.Instance._index,
                    Player.Instance._playlist.length - 1,
                    Player.Instance._indexes
                );
            })();

            if (Player.Instance._mode == Mode.RepeatAll && index > -1) {
                if (index === Player.Instance._playlist.length) {
                    Player.Instance._mode = Mode.RepeatNone;
                    return Player.Instance.play(0);
                }
            } else if (index === -1 || index === Player.Instance._playlist.length) {
                return Player.Instance._indexes = [];
            }

            Player.Instance.play(index);
        });
    }

    public play(index: number): void {
        if (this.playlist[index] !== undefined) {
            if (!this._indexes.includes(index)) {
                this._indexes.push(index);
            }

            audio.pause();
            drippy.getAudio(this.playlist[index]['id']).then(src => {
                this._index = index;
                audio.src = src;
                audio.load();
            });
        }
    }

    public toggle(): void {
        this._state == State.Playing ? audio.pause() : audio.play();
    }

    public repeat(): void {
        switch (this._mode) {
            case Mode.RepeatNone:
                this._mode = Mode.RepeatAll;
                break;
            case Mode.RepeatAll:
                this._mode = Mode.RepeatOnce;
                break;
            case Mode.RepeatOnce:
                this._mode = Mode.RepeatNone;
        }
        this.emit('update-state');
    }

    public shuffle(): void {
        switch (this._shuffle) {
            case ShuffleMode.ShuffleOff:
                this._shuffle = ShuffleMode.ShuffleOn;
                break;
            case ShuffleMode.ShuffleOn:
                this._shuffle = ShuffleMode.ShuffleOff;
                break;
        }
        this.emit('update-state');
    }

    public display(): void {
        video.play().then(() => (video as any).requestPictureInPicture());
    }

    public get index() {
        return this._index;
    }

    public get playlist() {
        return this._playlist;
    }

    public set playlist(playlist: any[]) {
        this._indexes = [];
        this._playlist = playlist;
    }

    public get position() {
        return audio.currentTime;
    }

    public set position(value: number) {
        audio.currentTime = value;
    }

    public get state() {
        return this._state;
    }

    public get mode() {
        return this._mode;
    }

    public get shuffle_mode() {
        return this._shuffle;
    }

    get volume() {
        return audio.volume * 100.0;
    }

    set volume(value) {
        audio.volume = value / 100.0;
        if (audio.volume == 0) {
            this._volume = Volume.Muted;
        } else if (audio.volume <= 0.25) {
            this._volume = Volume.VolumeLow;
        } else if (audio.volume <= 0.5) {
            this._volume = Volume.VolumeMedium;
        } else {
            this._volume = Volume.VolumeHigh;
        }
    }

    get Volume(): Volume {
        return this._volume;
    }

}

export declare interface Player extends EventEmitter {

    on(type: 'update-state', listener: () => void): this;
    on(type: 'update-time', listener: (time: number) => void): this;
    on(type: 'playback-started', listener: (track: any, index: number) => void): this;

}

export default Player.Instance;