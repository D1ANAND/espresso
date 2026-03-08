#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ===== OLED CONFIG =====
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

#define OLED_SDA 17
#define OLED_SCL 18
#define OLED_PWR 21

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);


const char* WIFI_SSID = "JioFiber-805";      // CHANGE
const char* WIFI_PASS = "11223344";          // CHANGE


const char* SERVER_IP   = "192.168.29.29";    // CHANGE to your PC IP
const int   SERVER_PORT = 4000;              // Next.js dev server port

const char* DESTINATION_CHAIN = "sepolia";
const char* RECEIVER_ADDR     = "0xD5E44Ee4c2CAd046Dcc9b0F4C1D7aA66d1f164b6";
const char* FUNCTION_SIG      = "transfer(address,uint256)";
const char* ARG0_ADDR         = "0xD5E44Ee4c2CAd046Dcc9b0F4C1D7aA66d1f164b6";
const char* ARG1_AMOUNT       = "1000000000000000000";


void showMessage(const String& line1,
                 const String& line2 = "",
                 const String& line3 = "",
                 const String& line4 = "",
                 const String& line5 = "",
                 const String& line6 = "",
                 const String& line7 = "",
                 const String& line8 = "") {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  if (line1.length()) display.println(line1);
  if (line2.length()) display.println(line2);
  if (line3.length()) display.println(line3);
  if (line4.length()) display.println(line4);
  if (line5.length()) display.println(line5);
  if (line6.length()) display.println(line6);
  if (line7.length()) display.println(line7);
  if (line8.length()) display.println(line8);

  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("ESP payload intent sender starting...");

  // Power on OLED
  pinMode(OLED_PWR, OUTPUT);
  digitalWrite(OLED_PWR, HIGH);
  delay(100);

  // Initialize I2C and OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("SSD1306 allocation failed");
    for (;;);  // Halt if OLED not found
  }

  

  // Connect Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connect FAILED");
    
    return;
  }

  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());

 
  

  // --- Build payload-style intent JSON for Next.js server ---
  String json = "{";
  json += "\"destination_chain\":\"" + String(DESTINATION_CHAIN) + "\",";
  json += "\"receiver\":\"" + String(RECEIVER_ADDR) + "\",";
  json += "\"function_signature\":\"" + String(FUNCTION_SIG) + "\",";
  json += "\"function_args\":[";
  json += "\"" + String(ARG0_ADDR) + "\",";
  json += "\"" + String(ARG1_AMOUNT) + "\"]";
  json += "}";

  Serial.println("JSON payload:");
  Serial.println(json);

  // --- Send HTTP POST to Next.js /api/esp-intent ---
  String url = String("http://") + SERVER_IP + ":" + String(SERVER_PORT) + "/escrow/esp-intent";
  Serial.print("POSTing to: ");
  Serial.println(url);

  showMessage(
    "Sending payload...",
    String("chain: ") + DESTINATION_CHAIN,
    String("intent:"),
    String(FUNCTION_SIG),
    String("receiver:"),
    String(RECEIVER_ADDR).substring(0, 21),
    String("to: ") + SERVER_IP + ":" + String(SERVER_PORT)
  );
  delay(2000);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(json);
  String resp = http.getString();

  Serial.print("HTTP status: ");
  Serial.println(httpCode);
  Serial.print("Response: ");
  Serial.println(resp);

  http.end();

  // --- Show result on OLED ---
  if (httpCode > 0) {
    showMessage(
      "Payload Sent!",
      String("dest: ") + DESTINATION_CHAIN,
      String("intent:"),
      String(FUNCTION_SIG),
      String("receiver:"),
      String(RECEIVER_ADDR).substring(0, 21),
      String("amt: ") + ARG1_AMOUNT
    );
  } else {
    showMessage(
      "Send FAILED!"
    );
  }

  Serial.println("Done. (Loop will do nothing.)");
}

void loop() {
  // For this test, do everything once in setup()
}