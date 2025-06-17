"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
console.log('▶️ Script started');
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// Initialize Supabase client
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
// ✅ DEBUG: Confirm if ENV is loaded properly
console.log('Supabase URL:', supabaseUrl);
console.log('Key present?', !!supabaseAnonKey);
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables');
    console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
    process.exit(1);
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
function seedDriver() {
    return __awaiter(this, void 0, void 0, function () {
        var driverData, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Starting driver seeding process...');
                    driverData = {
                        name: "Ravi Shankar",
                        license_number: "MH20LS7823",
                        contact_number: "9876543210",
                        email: "ravi.shankar@example.com",
                        join_date: "2023-08-15",
                        status: "active",
                        experience_years: 5,
                        documents_verified: true,
                        driver_photo_url: "https://example.com/photos/ravi_shankar.jpg",
                        license_expiry_date: "2026-08-14"
                    };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase
                            .from('drivers')
                            .insert(driverData)
                            .select()
                            .single()];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('Error inserting driver:', error);
                        return [2 /*return*/];
                    }
                    console.log('✅ Driver seeded successfully!');
                    console.log('Driver ID:', data.id);
                    console.log('Driver Name:', data.name);
                    console.log('License Number:', data.license_number);
                    // Create a driver profile in storage
                    return [4 /*yield*/, createDriverProfile(data.id, data)];
                case 3:
                    // Create a driver profile in storage
                    _b.sent();
                    console.log('✅ Driver profile created in storage');
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error('Unexpected error during driver seeding:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Helper function to create a driver profile in storage
function createDriverProfile(driverId, driverData) {
    return __awaiter(this, void 0, void 0, function () {
        var profileData, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    profileData = {
                        id: driverData.id,
                        name: driverData.name,
                        license_number: driverData.license_number,
                        contact_number: driverData.contact_number,
                        email: driverData.email,
                        join_date: driverData.join_date,
                        status: driverData.status,
                        experience_years: driverData.experience_years,
                        documents_verified: driverData.documents_verified,
                        driver_photo_url: driverData.driver_photo_url,
                        created_at: driverData.created_at,
                        updated_at: driverData.updated_at,
                        generated_at: new Date().toISOString()
                    };
                    return [4 /*yield*/, supabase.storage
                            .from('driver-profiles')
                            .upload("".concat(driverId, ".json"), JSON.stringify(profileData, null, 2), {
                            contentType: 'application/json',
                            upsert: true
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error uploading driver profile:', error);
                        throw error;
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Run the seed function
seedDriver()
    .then(function () {
    console.log('Seed script completed');
    process.exit(0);
})
    .catch(function (error) {
    console.error('Seed script failed:', error);
    process.exit(1);
});
