import firebase from '@firebase/app';
import '@firebase/firestore';

const config = {
    apiKey: "AIzaSyBkHACaF95g_m_SllGfh_bwhZ_lLSgwVeU",
    authDomain: "sensordata-5d8da.firebaseapp.com",
    databaseURL: "https://sensordata-5d8da.firebaseio.com",
    projectId: "sensordata-5d8da",
    storageBucket: "sensordata-5d8da.appspot.com",
    messagingSenderId: "783219449358"
};
firebase.initializeApp(config);
const firestore = firebase.firestore();
firestore.settings({ timestampsInSnapshots: true });
export default firestore;