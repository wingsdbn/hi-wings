// hi-wings runs without a console window: Plume is the whole UI.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hiwings_lib::run()
}
