
import React, {Component} from 'react';
import { StackActions, NavigationActions } from 'react-navigation';
import {AsyncStorage, StyleSheet, Dimensions, YellowBox, ScrollView, InteractionManager} from 'react-native';
import { Spinner, Container, View, Header, Title, Item, Input, Subtitle, Text, Content, Footer, Left, Right, Body, Card, CardItem, Button, Picker, Icon, Toast, Root} from 'native-base';
YellowBox.ignoreWarnings(['RCTBridge']);
import MapView, {Polygon, PROVIDER_GOOGLE} from 'react-native-maps';
import { Col, Row, Grid } from 'react-native-easy-grid';
var inside = require('point-in-polygon');

const {width, height} = Dimensions.get('window');

const SCREEN_HEIGHT = height;
const SCREEN_WIDTH = width;
const ASPECT_RATIO = width / height;
const LATTITUDE_DELTA = 0.005;
const LONGTITUDE_DELTA = LATTITUDE_DELTA * ASPECT_RATIO;

RADIUS = 0;

const ACCESS_TOKEN = 'access_token';

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username : "",
      results: "",
      api_token: "",
      xsrf: "",
      csrf: "",
      title: "",
      showToast: false,
      selected: undefined,
      initialPosition: {
        latitude: 0,
        longitude: 0,
        latitudeDelta: LATTITUDE_DELTA,
        longitudeDelta: LONGTITUDE_DELTA
      },
      markerPosition: {
        latitude: 0,
        longitude: 0
      },
      coordinates: [],//untuk polygon
      status: "",
      detail: "",
      check : "",
      office: "",
      reason: "",
      time: ""
    }
  }

  watchID: ?number = null;

  componentWillMount() {
    this.getCsrf();
    this.getDataUser();
    this.getDataOffice();
    this.checkStatus();
  }

  componentDidMount() {
    navigator.geolocation.getCurrentPosition((position) => {
      var lat = parseFloat(position.coords.latitude)
      var long = parseFloat(position.coords.longitude)

      var initialRegion = {
        latitude: lat,
        longitude: long,
        latitudeDelta: LATTITUDE_DELTA,
        longitudeDelta: LONGTITUDE_DELTA
      }

      this.setState({initialPosition: initialRegion})
    },
    (error) => alert(JSON.stringify(error)),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, distanceFilter: 1 });

    this.watchID = navigator.geolocation.watchPosition((position) => {
      var lat = parseFloat(position.coords.latitude)
      var long = parseFloat(position.coords.longitude)

      var lastRegion = {
        latitude: lat,
        longitude: long,
        latitudeDelta: LATTITUDE_DELTA,
        longitudeDelta: LONGTITUDE_DELTA
      }

      this.setState({markerPosition: lastRegion})
    },
    (error) => alert("Your Connection Error"),
    { enableHighAccuracy: true, timeout: 1000, maximumAge: 0, distanceFilter: 1 });
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextState.markerPosition !== this.state.markerPosition) {
      console.log("berubah");
    }
  }


  async getCsrf() {
    try {
      let response = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/csrf', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      if(response.status >= 200 && response.status < 300) {
        let data = await response.text();
        let cross = JSON.parse(data);
        let header = response.headers.get('Set-Cookie').split(";");
        let laravel_session =  header[3].split(" ");
        this.setState({
          csrf: cross.csrf,
          xsrf: header[0]+';'+laravel_session[2]
        });
      }
    } catch (error) {
      console.log("Something Wrong!");
    }
  }

  async getDataUser() {
    try {
      let accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      if(!accessToken) {
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'Signin' })],
          });
          this.props.navigation.dispatch(resetAction);
      } else {
        this.setState({
          results: JSON.parse(accessToken)
        });
        //saving token
        this.setState({
          username : this.state.results.data.username,
          api_token : this.state.results.data.api_token
        });
        let response = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/home?u='+ this.state.username, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization' : 'Bearer ' + this.state.api_token,
          }
        });
        if(response.status >= 200 && response.status < 300) {
          let data = await response.text();
          let user = JSON.parse(data);
          var next = user.data.expired_nextmonth;
          this.setState({
            title : user.data.title,
            expired_duration: user.data.expired_duration,
            expired_nextmonth: next
          });
        } else {
          console.log("You have got any error");
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'Signin' })],
          });
          this.props.navigation.dispatch(resetAction);
        }
      }
    } catch (error) {
      console.log("Something Wrong!");
      alert("Something Wrong with Your Account, Please Signin.");
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Signin' })],
      });
      this.props.navigation.dispatch(resetAction);
    }
  }

  async getDataOffice() {
    try {
      let accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      if(!accessToken) {
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'Signin' })],
          });
          this.props.navigation.dispatch(resetAction);
      } else {
        this.setState({
          results: JSON.parse(accessToken)
        });
        //saving token
        this.setState({
          username : this.state.results.data.username,
          api_token : this.state.results.data.api_token
        });
        let response_office = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/hcm/getlatitude?u='+ this.state.username, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization' : 'Bearer ' + this.state.api_token,
          }
        });
        if(response_office.status >= 200 && response_office.status < 300) {
          let data = await response_office.text();
          let office = JSON.parse(data);
          this.setState({
            coordinates: office.data,
            office : office.location
          });
        } else {
          console.log("You have got any errors");
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'Signin' })],
          });
          this.props.navigation.dispatch(resetAction);
        }
      }

    } catch(error) {
      console.log("Something Wrong!");
      alert("Something Wrong with Your Account, Please Signin.");
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Signin' })],
      });
      this.props.navigation.dispatch(resetAction);
    }
  }

  async checkStatus() {
    let accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
    try {
      if(!accessToken) {
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'Signin' })],
          });
          this.props.navigation.dispatch(resetAction);
      } else {
        this.setState({
          results: JSON.parse(accessToken)
        });
        //saving token
        this.setState({
          username : this.state.results.data.username,
          api_token : this.state.results.data.api_token
        });
        let response_status = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/hcm/statusattendance?u='+this.state.username+'&zona=WIB', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization' : 'Bearer ' + this.state.api_token,
          }
        });

        if(response_status.status >= 200 && response_status.status < 300) {
          let data = await response_status.text();
          let user = JSON.parse(data);
          this.setState({
            check : user.detail,
            time: user.data
          });
        } else {
          console.log("You have got any error");
        }
      }
    } catch(error) {
      alert("Something Error!");
    }
  }

  PressClockin = async() => {
    let polygon_office = this.state.coordinates.map((list, index) => ([Number(list.lat), Number(list.lng)]));
    let check = inside([this.state.markerPosition.latitude, this.state.markerPosition.longitude], polygon_office);

    if(check == true) {
      try {
        let response_clockin = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/hcm/clockin', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie' : this.state.xsrf,
            'Access-Control-Allow-Credentials':'true',
            'Access-Control-Allow-Origin': '*',
            'X-CSRF-TOKEN' : this.state.csrf,
            'Authorization' : 'Bearer ' + this.state.api_token,
          },
          body: JSON.stringify({
            u: this.state.username,
            location : this.state.office,
            latitude : this.state.markerPosition.latitude,
            longitude: this.state.markerPosition.longitude,
            zona: "WIB",
            status: "In",
            reason : "-",
            ip : "127.0.0.1"
          })
        });
        this.checkStatus();
        if(response_clockin.status >= 200 && response_clockin.status < 300) {
          let getStatus = JSON.parse(response_clockin._bodyText);
          this.setState({
            status: getStatus.status,
            detail : getStatus.detail
          });
          if(this.state.status== "Error" && this.state.detail == "Already Clocked In") {
            Toast.show({
              text: "You are already clocked in!",
              buttonText: "Close",
              position: "top",
              duration: 1000,
              style: {
                top: 70
              }
            });
          } else if(this.state.status== "Success" && this.state.detail == "Succes Clocked In, In Office") {
            Toast.show({
              text: "Succes clocked in!",
              buttonText: "Close",
              position: "top",
              duration: 3000,
              style: {
                top: 70
              }
            });
            this.setState({
              check : "Sudah Clock In, Belum Clock Out"
            });
          }
        } else {
          alert("Error connecting 404");
        }
      } catch (error) {
        alert("Something error");
      }
    } else if(check == false){
      try {
        let response_clockin = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/hcm/clockin', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie' : this.state.xsrf,
            'Access-Control-Allow-Credentials':'true',
            'Access-Control-Allow-Origin': '*',
            'X-CSRF-TOKEN' : this.state.csrf,
            'Authorization' : 'Bearer ' + this.state.api_token,
          },
          body: JSON.stringify({
            u: this.state.username,
            location : this.state.office,
            latitude : this.state.markerPosition.latitude,
            longitude: this.state.markerPosition.longitude,
            zona: "WIB",
            status: "In",
            reason : this.state.reason,
            ip : "127.0.0.1"
          })
        });
        this.checkStatus();
        if(response_clockin.status >= 200 && response_clockin.status < 300) {
          let getStatus = JSON.parse(response_clockin._bodyText);
          this.setState({
            status: getStatus.status,
            detail : getStatus.detail
          });
          if(this.state.status== "Error" && this.state.detail == "Already Clocked In") {
            Toast.show({
              text: "You are already clocked in!",
              buttonText: "Close",
              position: "top",
              duration: 1000,
              style: {
                top: 70
              }
            });
          } else if(this.state.status== "Success" && this.state.detail == "Succes Clocked In, In Office") {
            Toast.show({
              text: "Succes clocked in!",
              buttonText: "Close",
              position: "top",
              duration: 3000,
              style: {
                top: 70
              }
            });
            this.setState({
              check : "Sudah Clock In, Belum Clock Out"
            });
          }
        } else {
          alert("Error connecting 404");
        }
      } catch (error) {
        alert("Something error");
      }


    }
  }

  PressClockout = async() => {
    try {
      let response_clockout = await fetch('https://m.helpdesk-web.telkomsel.co.id/mservicedesk/api/v3/hcm/clockout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie' : this.state.xsrf,
          'Access-Control-Allow-Credentials':'true',
          'Access-Control-Allow-Origin': '*',
          'X-CSRF-TOKEN' : this.state.csrf,
          'Authorization' : 'Bearer ' + this.state.api_token,
        },
        body: JSON.stringify({
          u: this.state.username,
          location : this.state.office,
          latitude : this.state.initialPosition.latitude,
          longitude: this.state.initialPosition.longitude,
          zona: "WIB",
          status: "Out",
          reason : this.state.reason,
          ip : "127.0.0.1"
        })
      });
      this.checkStatus();
      if(response_clockout.status >= 200 && response_clockout.status < 300) {
        let getStatus = JSON.parse(response_clockout._bodyText);
        this.setState({
          status: getStatus.status,
          detail : getStatus.detail,
          check : ""
        });
        if(this.state.status== "Success" && this.state.detail == "Success Clocked Out") {
          Toast.show({
            text: "Success clocked out!",
            buttonText: "Close",
            position: "top",
            duration: 3000,
            style: {
              top: 70
            }
          });
        }
      } else {
        alert("Error connecting 404");
      }
    } catch (error) {
      alert("Something error");
    }
  }



  redirectHome() {
    this.props.navigation.navigate('Home');
  }


  render() {
    if(this.state.title =="") {
      return(
        <Container>
          <Header style={{
              backgroundColor: 'rgb(202,34,39)',
              paddingLeft: 20,
              borderBottomWidth: 0,
              paddingRight: 20,
              borderBottomColor: '#e5e5e5'
            }} iosBarStyle="light-content">
            <Left>
              <Button transparent onPress={()=>this.redirectHome()}>
                <Icon name="md-arrow-back" style={{color: '#fff'}}/>
              </Button>
            </Left>
            <Body>
              <Title style={{color:'#fff', fontWeight:'bold'}}>Attendance</Title>
            </Body>
            <Right/>
          </Header>
          <Content style={{marginTop: 25}}>
            <Title>Please waiting ...</Title>
            <Spinner color="black"/>
          </Content>
        </Container>
      )
    } else {
      let tanggal = new Date();
      let day = tanggal.toDateString();
      const polygon = this.state.coordinates.map(list => {
        let coords = {
          latitude: Number(list.lat),
          longitude: Number(list.lng)
        }
        return coords;
      });
      if(this.state.check === "Sudah Clock In, Belum Clock Out") {
         button = <Button onPress={this.PressClockout} primary full style={{margin:15, borderRadius:5, bottom: 5}}>
                     <Text style={{fontWeight:'bold'}}>Clock Out</Text>
                   </Button>
      } else {
        button = <Button onPress={this.PressClockin} full style={{margin:15, borderRadius:5, backgroundColor: 'rgb(202,34,39)', bottom: 5}}>
                    <Text style={{fontWeight:'bold'}}>Clock In</Text>
                 </Button>
      }

      let polygon_office = this.state.coordinates.map((list, index) => ([Number(list.lat), Number(list.lng)]));
      let check = inside([this.state.markerPosition.latitude, this.state.markerPosition.longitude], polygon_office);

      if(check === true) {
        status_position = "You are current position in the Office";
        office = this.state.office;
        reason = null;
      } else {
        status_position = "You are current position out of Office";
        office = "Nothing location to display";
        reason =
            <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#ddd', backgroundColor: '#fff' }}>
              <Left>
                <Item style={{backgroundColor: '#f5f5f5', borderRadius:5, marginBottom: 10, color: '#eee', paddingLeft: 20, marginLeft: 0 , borderBottomWidth: 0}}>
                  <Input placeholder="Reason" onChangeText={(text) => this.setState({reason: text}) }/>
                </Item>
              </Left>
            </CardItem>
      }

      if(this.state.time.flag == 0) {
        flag =
        <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#ddd', backgroundColor: '#fff' }}>
          <Left>
            <Text style={{fontSize: 12}}>
              You have no clock in today
            </Text>
          </Left>
        </CardItem>
      } else if(this.state.time.flag == 1) {
        flag =
        <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#fff', backgroundColor: '#fff' }}>
          <Grid>
            <Col style={{backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1, padding:10, borderRightWidth: 0.7}}>
              <Text style={{fontSize: 12, color: '#777'}}>
                In Time
              </Text>
              <Text style={{fontSize: 12}}>
                {this.state.time.hour_in}
              </Text>
            </Col>
            <Col style={{backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1, padding:10, borderLeftWidth: 0.7}}>
              <Text style={{fontSize: 12, color: '#777'}}>
                Out Time
              </Text>
              <Text style={{fontSize: 12}}>
                -
              </Text>
            </Col>
          </Grid>
        </CardItem>
      } else {
        flag =
        <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#fff', backgroundColor: '#fff' }}>
          <Grid>
            <Col style={{backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1, padding:10, borderRightWidth: 0.7}}>
              <Text style={{fontSize: 12, color: '#777'}}>
                In Time
              </Text>
              <Text style={{fontSize: 12}}>
                {this.state.time.hour_in}
              </Text>
            </Col>
            <Col style={{backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1, padding:10, borderLeftWidth: 0.7}}>
              <Text style={{fontSize: 12, color: '#777'}}>
                Out Time
              </Text>
              <Text style={{fontSize: 12}}>
                {this.state.time.hour_out}
              </Text>
            </Col>
          </Grid>
        </CardItem>
      }


      return (
        <Root>
          <Container>
            <Header style={{
                backgroundColor: 'rgb(202,34,39)',
                paddingLeft: 20,
                borderBottomWidth: 0,
                borderBottomColor: '#e5e5e5'
              }} iosBarStyle="light-content">
              <Left>
                <Button transparent onPress={()=>this.redirectHome()}>
                  <Icon name="md-arrow-back" style={{color: '#fff'}}/>
                </Button>
              </Left>
              <Body>
                <Title style={{color:'#fff', fontWeight:'bold'}}>Attendance</Title>
              </Body>
              <Right>
                <Button small primary>
                  <Text style={{color:'#fff', fontWeight:'bold', fontSize: 10}}>Approval</Text>
                </Button>
              </Right>
            </Header>
              <View style={{ width, height, flex: 1 }}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    showsUserLocation
                    followsUserLocation
                    region={this.state.initialPosition}
                    showsMyLocationButton={true}
                    loadingEnabled
                    zoomEnabled = {true}
                    >
                    <Polygon
                    coordinates={polygon}
                    strokeColor="rgba(0, 255, 18, 1)"
                    fillColor="rgba(97, 214, 15, 0.77)"
                    strokeWidth={1}
                    />
                  </MapView>
              </View>
              <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#ddd', backgroundColor: '#fff' }}>
                <Left>
                  <Text>{status_position}</Text>
                </Left>
              </CardItem>
              {reason}
              <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#ddd', backgroundColor: '#fff' }}>
                <Left>
                  <Text style={{color: '#777', fontSize: 12}}>{office}</Text>
                </Left>
              </CardItem>
              {flag}
              <CardItem bordered style={{borderTopWidth: 0, marginBottom: -10, borderColor: '#ddd', backgroundColor: '#fff' }}>
                <Left>
                  <Text style={{color:'#216beb', fontWeight: 'bold', fontSize: 17}}>
                    {day}
                  </Text>
                </Left>
                <Right/>
              </CardItem>
              <CardItem style={{backgroundColor: 'rgba(255, 255, 255, 0)', borderBottomWidth: 0, marginBottom: -10, borderColor: '#ccc' }}>
                <Left>
                  <Text style={{color: "#222", marginBottom: 5, marginTop: 10}}>{this.state.results.data.name}</Text>
                </Left>
                <Right>
                  <Text
                    style={{
                      color: '#333', marginTop: 10
                    }}>{this.state.results.data.nik}</Text>
                </Right>
              </CardItem>
              {button}
              <Button full style={{margin:15, marginTop:0, borderRadius:5, backgroundColor: '#eee', bottom: 10}} onPress={()=>this.redirectHome()}>
                <Text style={{color: '#777', fontWeight:'bold'}}>Back</Text>
              </Button>
          </Container>
        </Root>
      );
    }
  }
}

export default Map;



const styles = StyleSheet.create({
  radius: {
    height: 50,
    width: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(177, 108, 224, 0.24)',
    borderWidth: 1,
    borderColor: 'rgb(179, 61, 227)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  marker: {
    height:20,
    width: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 20 / 2,
    overflow: 'hidden',
    backgroundColor: 'rgb(141, 6, 224)'
  },

  map: {
    marginTop: 0,
    ...StyleSheet.absoluteFillObject,
  },
});
