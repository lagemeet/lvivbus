#include <pebble.h>

#define NUM_MENU_SECTIONS 1
#define NUM_FIRST_MENU_ITEMS 7

static Window *window;
static MenuLayer *menu_layer;
static TextLayer *text_layer;

static char busnum_buf[32];
static char busroute_buf[256];
static char count_buf[8];
static char total_buf[8];

static Window *s_window;
static SimpleMenuLayer *s_simple_menu_layer;
static SimpleMenuSection s_menu_sections[NUM_MENU_SECTIONS];
static SimpleMenuItem s_menu_items[NUM_FIRST_MENU_ITEMS];

static NumberWindow *number_window;

static void s_select_callback(int index, void *ctx){}

static uint16_t menu_get_num_sections_callback(MenuLayer *menu_layer, void *data) {

        // Two menu sections
	return 1;
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {

        // Six menu items
	return 6;
}

static int16_t menu_get_header_height_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {

        // No header
	return 0;
}

static void menu_draw_header_callback(GContext* ctx, const Layer *cell_layer, uint16_t section_index, void *data) {

        // No header
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {

        // Menu items
	switch (cell_index->section) {
		case 0:
			switch (cell_index->row) {
				case 0:
					menu_cell_basic_draw(ctx, cell_layer, "Петлюри", "172 від центру", NULL);
					break;
				case 1:
					menu_cell_basic_draw(ctx, cell_layer, "Петлюри", "173 до центру", NULL);
					break;
				case 2: 
					menu_cell_basic_draw(ctx, cell_layer, "Dummy", "empty", NULL);
					break;
				case 3: 
					menu_cell_basic_draw(ctx, cell_layer, "Dummy", "empty", NULL);
					break;
				case 4: 
					menu_cell_basic_draw(ctx, cell_layer, "Dummy", "empty", NULL);
					break;
				case 5: 
					menu_cell_basic_draw(ctx, cell_layer, "Номер зупинки", "Вибір за номером", NULL);
					break;
			}
			break;
	}
}

static void SendRequest(char *data) {

        // Send request from watch to phone
	DictionaryIterator *iter1;
	app_message_outbox_begin(&iter1);
	dict_write_cstring(iter1, MESSAGE_KEY_REQUEST, data);
	app_message_outbox_send();
}

static void busstop_select_callback(struct NumberWindow *number_window, void *context) {
	int busstop_num = number_window_get_value(number_window);
  char busstop_num_temp[8];
  snprintf(busstop_num_temp, sizeof(busstop_num_temp), "%d", busstop_num);
	window_stack_pop(true);
  SendRequest(busstop_num_temp);
}

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	
        // Menu selection
  text_layer_set_text(text_layer, "Loading...");
	switch (cell_index->row) {
		case 0:
			SendRequest("172");
			break;
		case 1:
			SendRequest("173");
			break;
		case 2:
      SendRequest("50");
      break;
		case 3:
			SendRequest("pacman");
			break;
		case 4:
			SendRequest("rainbow");
			break;
		case 5:
      number_window = number_window_create("Номер зупинки", (NumberWindowCallbacks) { .selected = busstop_select_callback }, NULL);
    	number_window_set_min(number_window, 1);
	    number_window_set_max(number_window, 500);
	    number_window_set_step_size(number_window, 1);
      window_stack_push((Window*)number_window, true);
			break;
	}
}

static void s_window_load(Window *window) {
}

static void s_window_unload(Window *window) {
  simple_menu_layer_destroy(s_simple_menu_layer);
  number_window_destroy(number_window);
  text_layer_set_text(text_layer, "LvivBus");
}

void DrawResults(int total) {

  s_menu_sections[0] = (SimpleMenuSection) {
    .num_items = total,
    .items = s_menu_items,
  };
  
  s_window = window_create();

  Layer *window_layer = window_get_root_layer(s_window);
  GRect bounds = layer_get_frame(window_layer);

  s_simple_menu_layer = simple_menu_layer_create(bounds, s_window, s_menu_sections, NUM_MENU_SECTIONS, NULL);
  
  window_set_window_handlers(s_window, (WindowHandlers) {
		.load = s_window_load,
		.unload = s_window_unload,
	});
  
  window_stack_push(s_window, "true");
  layer_add_child(window_layer, simple_menu_layer_get_layer(s_simple_menu_layer));
  
  vibes_short_pulse();
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {

        // Receive response from phone to watch
  
  Tuple *busnum = dict_find(iterator, MESSAGE_KEY_RESPONSE);
  Tuple *busroute = dict_find(iterator, MESSAGE_KEY_RESPONSE_TEXT);
  Tuple *count = dict_find(iterator, MESSAGE_KEY_RESPONSE_COUNT);
  Tuple *total = dict_find(iterator, MESSAGE_KEY_TOTAL);
  
  Tuple *bg_color = dict_find(iterator, MESSAGE_KEY_BackgroundColor);
  Tuple *second_tick = dict_find(iterator, MESSAGE_KEY_SecondTick);

  if (busnum && busroute && count){
      snprintf(busnum_buf, sizeof(busnum_buf), "%s", busnum->value->cstring);
      snprintf(busroute_buf, sizeof(busroute_buf), "%s", busroute->value->cstring);
      snprintf(count_buf, sizeof(count_buf), "%d", (int)count->value->int32);
      snprintf(total_buf, sizeof(total_buf), "%d", (int)total->value->int32);

      int total_num = atoi(total_buf);
  
      int counter = atoi(count_buf);
      char *busnum_temp = malloc(sizeof(busnum_buf));
      strcpy(busnum_temp, busnum_buf);
      char *busroute_temp = malloc(sizeof(busroute_buf));
      strcpy(busroute_temp, busroute_buf);
  
      s_menu_items[counter] = (SimpleMenuItem) {
        .title = busnum_temp,
        .subtitle = busroute_temp,
        .callback = s_select_callback,
      };
  
      if (counter == total_num-1){
        DrawResults(total_num);
        //free(busnum_temp);
        free(busroute_temp);
      }
  }
  if (bg_color){
    char bg_color_buf[32];
    snprintf(bg_color_buf, sizeof(bg_color_buf), "%s", bg_color->value->cstring);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "BackgroundColor: %s", bg_color_buf);
  }
  
}

static void window_load(Window *window) {
	
	Layer *window_layer = window_get_root_layer(window);
	GRect bounds = layer_get_frame(window_layer);
	bounds.origin.y += MENU_CELL_BASIC_HEADER_HEIGHT;
	bounds.size.h -= MENU_CELL_BASIC_HEADER_HEIGHT;
	menu_layer = menu_layer_create(bounds);
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks) {
		.get_num_sections = menu_get_num_sections_callback,
		.get_num_rows = menu_get_num_rows_callback,
		.get_header_height = menu_get_header_height_callback,
		.draw_header = menu_draw_header_callback,
		.draw_row = menu_draw_row_callback,
		.select_click = menu_select_callback,
	});
	bounds = layer_get_bounds(window_layer);
	bounds.size.h = MENU_CELL_BASIC_HEADER_HEIGHT;
	text_layer = text_layer_create(bounds);
	text_layer_set_text_color(text_layer, GColorFromRGB(255, 255, 255));
	text_layer_set_background_color(text_layer, GColorFromRGB(0, 0, 255));
#ifdef PBL_COLOR
	menu_layer_set_highlight_colors(menu_layer, GColorFromRGB(0, 255, 255), GColorFromRGB(0, 0, 0));
#endif
	menu_layer_set_click_config_onto_window(menu_layer, window);
	text_layer_set_text(text_layer, "LvivBus");
	layer_add_child(window_layer, menu_layer_get_layer(menu_layer));
	layer_add_child(window_layer, text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
	menu_layer_destroy(menu_layer);
}

static void init(void) {
	
	window = window_create();
	app_message_register_inbox_received(inbox_received_callback);
	app_message_open(app_message_inbox_size_maximum()/2, app_message_outbox_size_maximum()/4);
	window_set_window_handlers(window, (WindowHandlers) {
		.load = window_load,
		.unload = window_unload,
	});
	const bool animated = true;
	window_stack_push(window, animated);
}

static void deinit(void) {
	window_destroy(s_window);
	window_destroy(window);
}

int main(void) {
	
	init();
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);
	app_event_loop();
	deinit();
}
