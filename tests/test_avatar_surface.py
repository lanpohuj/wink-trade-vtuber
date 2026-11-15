"""Native surface geometry; no GUI, broker, voice or network calls."""
import unittest
from winky.avatar_surface import window_geometry,pointer_in_portrait
class AvatarSurfaceTests(unittest.TestCase):
    def test_screen_bottom_and_portrait_height_survive_expansion(self):
        for width,height in [(1728,1117),(1920,1080),(1440,900)]:
            g=window_geometry(width,height)
            self.assertEqual(g['y']+g['height'],height)
            self.assertEqual(g['y']+g['top'],height-720)
            self.assertGreaterEqual(g['x'],0);self.assertLessEqual(g['x']+g['width'],width)
    def test_added_empty_margins_pass_mouse_to_the_application_below(self):
        for point in [(0,400),(199,400),(800,400),(999,400),(500,720),(500,919)]:
            self.assertFalse(pointer_in_portrait(*point),point)
        for point in [(200,0),(799,719),(500,360)]:self.assertTrue(pointer_in_portrait(*point),point)
    def test_dragging_keeps_the_same_mouse_region_relative_to_the_portrait(self):
        for origin in [(0,0),(123,300),(728,197)]:
            for point,expected in [((500,400),True),((150,400),False),((500,850),False)]:
                screen=(origin[0]+point[0],origin[1]+point[1])
                self.assertEqual(pointer_in_portrait(screen[0]-origin[0],screen[1]-origin[1]),expected)
if __name__=='__main__':unittest.main()
