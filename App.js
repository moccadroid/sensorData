/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, View, ActivityIndicator,
    TextInput, TouchableOpacity, AsyncStorage, Picker} from 'react-native';
import { Magnetometer } from 'react-native-sensors';
import wifi from 'react-native-android-wifi';
import firestore from './firebase';

type Props = {};
export default class App extends Component<Props> {

    constructor(props) {
        super(props);
        
        this.state = {
            wifiData: {},
            magnetometer: {},
            
            granted: false,
            scanning: false,
            rooms: ['living room', 'kitchen', 'bedroom'],
            activeRoom: 'living room',
            username: undefined,
            sending: false,
            error: false,
            
            topWifiSignal: undefined,
            topMagnetSignal: undefined,
        };
    }
    
    
    async componentDidMount() {
        if (!this.state.granted) {
            let granted = await this.getPermission();
            this.setState({ granted: granted });
        }
        
        AsyncStorage.getItem('username').then(username => {
            this.setState({ username });
        });
    }
    
    async getPermission() {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    'title': 'Wifi networks',
                    'message': 'We need your permission in order to find wifi networks'
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            return false;
        }
    }
    
    async scanMagnetometer() {
        const observable = await new Magnetometer({ updateInterval: 500 });
        observable.subscribe(value => {
            if (this.state.scanning) {
                const data = this.state.magnetometer;
                
                let roomData = this.state.magnetometer[this.state.activeRoom];
                if (!roomData) {
                    roomData = { magnetData: [] }
                }
                
                roomData.magnetData = [...roomData.magnetData, value];
                
                data[this.state.activeRoom] = roomData;
                
                this.setState({
                    magnetometer: data, 
                    topMagnetSignal: { x: value.x, y: value.y, z: value.z}
                });
            }
        });
    }
    
    scanWifi() {
        console.log("scanning");

        wifi.reScanAndLoadWifiList((wifiStringList) => {
            const wifiArray = JSON.parse(wifiStringList);
            this.setState({ topWifiSignal: wifiArray[0]});
            
            const data = this.state.wifiData;

            let roomData = this.state.wifiData[this.state.activeRoom];
            if (!roomData) {
                roomData = { wifiData: {}}
            }

            wifiArray.forEach(wifi => {
                let wifiData = roomData.wifiData[wifi.BSSID];
                if (!wifiData) {
                    wifiData = {levels: [], ssid: wifi.SSID};
                }
                wifiData.levels = [...wifiData.levels, wifi.level];
                roomData.wifiData[wifi.BSSID] = wifiData;
            });
            data[this.state.activeRoom] = roomData;

            this.setState({ wifiData: data});
        }, error => console.log(error));
        
        console.log(this.state.scanning);
        if (this.state.scanning) {
            setTimeout(this.scanWifi.bind(this), 500);
        }
    
    }
    
    startScanning() {
        if (this.state.granted) {
            this.setState({scanning: true}, () => {
                this.scanWifi();
                this.scanMagnetometer();
            });
        }
    }
    
    stopScanning() {
        this.setState({ scanning: false });
    }
    
    uploadData() {
        this.stopScanning();
        
        if (this.state.username && this.state.username !== '') {
            this.setState({ sending: true });
            firestore.collection(this.state.username).doc('wifi').set(this.state.wifiData).then(result => {
                firestore.collection(this.state.username).doc('magnetometer').set(this.state.magnetometer).then(result => {
                    this.setState({ sending: false });
                });
            });
            
        } else {
            this.setState({ error: true });
        }
        
        console.log(this.state.username);
        
    }
  
    render() {
            
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.welcome}>{this.state.topMagnetSignal ? JSON.stringify(this.state.topMagnetSignal) : ''}</Text>
                    <Text style={styles.welcome}>{this.state.topWifiSignal 
                        ? this.state.topWifiSignal.BSSID + '\n' + this.state.topWifiSignal.SSID + '\n' + this.state.topWifiSignal.level 
                        : 'start scanning'}</Text>
                    <TextInput maxLength={18}
                               underlineColorAndroid='transparent'
                               value={this.state.username}
                               placeholder='Enter your username...'
                               //placeholderTextColor={colors.lightGrey}
                               onChangeText={username => this.setState({ username, error: false })}
                    />
                    { this.state.error && <Text style={styles.error}>Please enter a username</Text> }
                    <Text style={styles.instructions}>Click the button to scan your local wifis</Text>
                    { !this.state.scanning
                        ?
                            <TouchableOpacity style={styles.button} onPress={this.startScanning.bind(this)}>
                                <Text style={styles.buttonText}>Scan Wifis</Text>
                            </TouchableOpacity>
                        :
                            <TouchableOpacity style={[styles.button, styles.buttonRed]} onPress={this.stopScanning.bind(this)}>
                                <Text style={styles.buttonText}>Stop</Text>
                            </TouchableOpacity>
                    }
                    <Picker selectedValue={this.state.activeRoom} 
                            onValueChange={value => this.setState({activeRoom: value})} 
                            style={{ height: 50, width: 200}}>
                        <Picker.Item label="Living Room" value="livingRoom" />
                        <Picker.Item label="Kitchen" value="kitchen" />
                        <Picker.Item label="Bedroom" value="bedroom" />
                    </Picker>
                </View>
                { /*
                <FlatList style={styles.list}
                          data={this.state.wifis} 
                          renderItem={this.renderItem.bind(this)} 
                          keyExtractor={(item, index) => {
                              return item.BSSID
                }}/>
                */}
                <View style={styles.sendButton}>
                    <TouchableOpacity style={styles.button} onPress={this.uploadData.bind(this)}>
                        {
                            this.state.sending 
                                ? <ActivityIndicator size="small"/>
                                : <Text style = {styles.buttonText}>Upload Data</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        //justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
        //paddingTop: 60,
    },
    header: {
        flex: 0.8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    welcome: {
        fontSize: 14,
        textAlign: 'center',
        margin: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
    sendButton: {
        flex: 0.2  
    },
    button: {
        padding: 10,
        backgroundColor: '#0074D9',
        borderRadius: 8,
        width: 100,
        alignItems: 'center'
    },
    buttonRed: {
        backgroundColor: '#FF4136'  
    },
    buttonText: {
        color: 'white',
    },
    list: {
        flex: 0.7,
        alignSelf: 'stretch',
        //paddingBottom: 100,
        //paddingTop: 50,
        //paddingTop: 50,
    },
    listItem: {
        padding: 10  
    },
    listItemDetails: {
        paddingLeft: 15
    },
    error: {
        color: 'red'
    }
    
});
