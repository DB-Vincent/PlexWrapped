const express = require('express'), 
    axios = require('axios'), 
    bodyParser = require('body-parser');
const app = express();
const port = 3000;

config_data = require('./config.json')

const tautulli = config_data.tautulli_url; 
const api_key = config_data.api_key;

app.engine('html', require('ejs').renderFile);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public")); 

app.get('/', (req, res) => {
    res.render(__dirname + '/public/index.ejs');
});

app.post('/', (req, res) => {
    var startTime, endTime;
    startTime = new Date();

    getUser(req.body.email)
    .then((user) => {
        Promise.all([getPlayTime(user.user_id), getPlayerStats(user.user_id), getPlayStats(user.user_id), getMostPopularTV(user.user_id), getMostPopularMovie(user.user_id), getMostPopularMusic(user.user_id), getTopUser]).then((values) => {
            endTime = new Date();
            var timeDiff = endTime - startTime;
            timeDiff /= 1000;

            res.render(__dirname + '/public/result.ejs', {
                user_pic: user.thumb,
                username: user.username,
                playtime: values[0].play_time,
                players: values[1].players,
                plays: values[2].plays,
                most_popular_tv: values[3].plays,
                most_popular_movies: values[4].plays,
                most_popular_music: values[5].plays,
                top_users: values[6].users,
                load_time: timeDiff
            });
        });
    });
});

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

const getUser = (email) => new Promise((resolve, reject) => {
    axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_users`)
    .then(response => {
        response.data.response.data.forEach(user => {
            (user.email === email) ? resolve(user) : "";
        })
    })
    .catch(error => {
        reject(error);
    });
});

const getPlayTime = (user_id) => new Promise((resolve, reject) => {
    axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_user_watch_time_stats&user_id=${user_id}&query_days=365`)
    .then(response => {
        play_time = Math.round(response.data.response.data[0].total_time / 60 / 60);
        resolve({play_time: play_time});
    })
    .catch(error => {
        reject(error);
    });
});

const getPlayStats = (user_id) => new Promise((resolve, reject) => {
    axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_plays_by_date&user_id=${user_id}&time_range=365`)
    .then(response => {
        var result = [];
        response.data.response.data.series.forEach(series => {
                result.push({name: series.name, plays: series.data.reduce((a, b) => a + b, 0)});
        });

        resolve({plays: result});
    })
    .catch(error => {
        reject(error);
    });
});

const getPlayerStats = (user_id) => new Promise((resolve, reject) => {
    axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_user_player_stats&user_id=${user_id}`)
    .then(response => {
        var result = [
            { id: 0, name: response.data.response.data[0].player_name, total_plays: response.data.response.data[0].total_plays },
            { id: 1, name: response.data.response.data[1].player_name, total_plays: response.data.response.data[1].total_plays },
            { id: 2, name: response.data.response.data[2].player_name, total_plays: response.data.response.data[2].total_plays },
        ];

        resolve({players: result});
    })
    .catch(error => {
        reject(error);
    });
});

const getMostPopularTV = (user_id) => new Promise((resolve, reject) => {
    var shows = [], result = [];
    var date = new Date("2020-01-01");
    new Promise((resolve, reject) => {
        (function loop(i) {
            if (i < 365) new Promise((resolve, reject) => {
                axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_history&user_id=${user_id}&media_type=episode&length=50&start_date=${date.toISOString().slice(0,10)}`)
                .then(response => {
                    response.data.response.data.data.forEach(item => {
                        if (shows.some(element => element.name === item.grandparent_title)) {
                            movie = shows.find(x => x.name === item.grandparent_title)
                            movie.plays += 1;
                        } else {
                            shows.push({ name: item.grandparent_title, plays: 1 });
                        }
                    });
    
                    shows.sort(dynamicSort("plays"));
                    shows.reverse();
    
                    result = shows.filter((shows,idx) => idx < 5);
    
                    date.setDate(date.getDate() + 1);
                    
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
            }).then(loop.bind(null, i+1));

            if(i === 364) {
                resolve();
            }
        })(0);
    }).then(() => {
        resolve({ plays: result });
    });
});

const getMostPopularMovie = (user_id) => new Promise((resolve, reject) => {
    var movies = [], result = [];
    var date = new Date("2020-01-01");
    new Promise((resolve, reject) => {
        (function loop(i) {
            if (i < 365) new Promise((resolve, reject) => {
                axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_history&user_id=${user_id}&media_type=movie&length=50&start_date=${date.toISOString().slice(0,10)}`)
                .then(response => {
                    response.data.response.data.data.forEach(item => {
                        if (movies.some(element => element.name === item.title)) {
                            movie = movies.find(x => x.name === item.title)
                            movie.plays += 1;
                        } else {
                            movies.push({ name: item.title, plays: 1 });
                        }
                    });
    
                    movies.sort(dynamicSort("plays"));
                    movies.reverse();
    
                    result = movies.filter((movies,idx) => idx < 5);
    
                    date.setDate(date.getDate() + 1);
                    
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
            }).then(loop.bind(null, i+1));

            if(i === 364) {
                resolve();
            }
        })(0);
    }).then(() => {
        resolve({ plays: result });
    });
});

const getMostPopularMusic = (user_id) => new Promise((resolve, reject) => {
    var artist = [], result = [];
    var date = new Date("2020-01-01");
    new Promise((resolve, reject) => {
        (function loop(i) {
            if (i < 365) new Promise((resolve, reject) => {
                axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_history&user_id=${user_id}&media_type=track&length=50&start_date=${date.toISOString().slice(0,10)}`)
                .then(response => {
                    response.data.response.data.data.forEach(item => {
                        if (artist.some(element => element.name === item.grandparent_title)) {
                            movie = artist.find(x => x.name === item.grandparent_title)
                            movie.plays += 1;
                        } else {
                            artist.push({ name: item.grandparent_title, plays: 1 });
                        }
                    });
    
                    artist.sort(dynamicSort("plays"));
                    artist.reverse();
    
                    result = artist.filter((artist,idx) => idx < 5);
    
                    date.setDate(date.getDate() + 1);
                    
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
            }).then(loop.bind(null, i+1));

            if(i === 364) {
                resolve();
            }
        })(0);
    }).then(() => {
        resolve({ plays: result });
    });
});

const getTopUser = new Promise((resolve, reject) => {
    var result =[];
    axios.get(`${tautulli}/api/v2?apikey=${api_key}&cmd=get_home_stats&time_range=365`)
    .then(response => {
        response.data.response.data[7].rows.forEach((user) => {
            result.push({ id: user.user_id, name: user.user, total_time: Math.round(user.total_duration / 60 / 60), total_plays: user.total_plays })
        })

        result = result.filter((result,idx) => idx < 3);

        resolve({ users: result });
    })
    .catch(error => {
        reject(error);
    });
});

app.listen(port, () => {
  console.log(`PlexWrapped listening at http://localhost:${port}`);
})