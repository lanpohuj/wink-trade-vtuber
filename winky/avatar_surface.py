"""Transparent render space around the original close portrait, in macOS points."""
PORTRAIT_WIDTH=600
PORTRAIT_HEIGHT=720
PADDING_LEFT=200
PADDING_TOP=200
PADDING_RIGHT=200
SURFACE_WIDTH=PORTRAIT_WIDTH+PADDING_LEFT+PADDING_RIGHT
SURFACE_HEIGHT=PORTRAIT_HEIGHT+PADDING_TOP

def window_geometry(screen_width,screen_height):
    """Expand upward and sideways, retaining the portrait's bottom screen edge."""
    portrait_x=max(0,screen_width-PORTRAIT_WIDTH-10)
    height=max(PORTRAIT_HEIGHT,min(SURFACE_HEIGHT,screen_height))
    return {'width':SURFACE_WIDTH,'height':height,'top':height-PORTRAIT_HEIGHT,
            'x':max(0,min(portrait_x-PADDING_LEFT,screen_width-SURFACE_WIDTH)),
            'y':max(0,screen_height-height)}

def pointer_in_portrait(x,y,width=SURFACE_WIDTH,height=SURFACE_HEIGHT):
    """Window-local Cocoa coordinates: the bottom of both surfaces is the same."""
    return PADDING_LEFT<=x<PADDING_LEFT+PORTRAIT_WIDTH and 0<=y<PORTRAIT_HEIGHT
